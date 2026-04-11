#!/usr/bin/env node
/**
 * gitrails production scanner — diff-first, retrieval-gated, structured handoffs
 *
 * Architecture:
 *   PR/diff → changed files → retrieval gate (vector + graph) → agent chain
 *   sentinel → structured JSON → reviewer → scribe → mirror → GitHub PR comment + Check
 *
 * Key design decisions vs demo-scan.js:
 *   1. Diff-first: agents see only changed files, not full repo
 *   2. Structured handoffs: each agent receives the previous agent's JSON, not raw text
 *   3. Per-agent token budgets enforced programmatically
 *   4. Model routing: heavy model for analysis, light model for scoring
 *   5. GitHub API: posts PR comment + Check run (no gitclaw SDK — direct API calls)
 *
 * Usage:
 *   node scripts/pr-scan.js --pr 42               # PR mode (GitHub API)
 *   node scripts/pr-scan.js --diff HEAD~1..HEAD    # local diff mode
 *   node scripts/pr-scan.js --full [--target ./]   # full scan (CI fallback)
 *
 * Required env:
 *   GROQ_API_KEY
 *   GITRAILS_MODEL_HEAVY   (or GITRAILS_MODEL as fallback)
 *   GITRAILS_MODEL_LIGHT   (or GITRAILS_MODEL_HEAVY as fallback)
 *
 * GitHub env (set automatically by gitrails-pr.yml):
 *   GITHUB_TOKEN, GITRAILS_REPO, GITHUB_SHA, GITRAILS_PR_NUMBER
 */

import { execSync }                        from 'child_process';
import { existsSync, readFileSync,
         appendFileSync, writeFileSync }   from 'fs';
import { fileURLToPath }                   from 'url';
import { dirname, join }                   from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ── Config loader ─────────────────────────────────────────────────────────────
// Reads config/production.yaml (if NODE_ENV=production) or config/default.yaml.
// Falls back to hardcoded defaults so removing the YAML never breaks the runner.

function loadConfig() {
  const env  = process.env.NODE_ENV === 'production' ? 'production' : 'default';
  const path = join(ROOT, 'config', `${env}.yaml`);
  const defaults = {
    autoApprove:      0.3,
    requireReview:    0.7,
    labelApproved:    'gitrails/approved',
    labelNeedsReview: 'gitrails/needs-review',
    labelBlocked:     'gitrails/blocked',
  };
  try {
    const text   = readFileSync(path, 'utf-8');
    const getNum = (key) => { const m = text.match(new RegExp(`^\\s*${key}:\\s*([\\d.]+)`, 'm')); return m ? parseFloat(m[1]) : null; };
    const getStr = (key) => { const m = text.match(new RegExp(`^\\s*${key}:\\s*(.+)`,      'm')); return m ? m[1].trim()       : null; };
    return {
      autoApprove:      getNum('auto_approve')   ?? defaults.autoApprove,
      requireReview:    getNum('require_review') ?? defaults.requireReview,
      labelApproved:    getStr('approved')        ?? defaults.labelApproved,
      labelNeedsReview: getStr('needs_review')    ?? defaults.labelNeedsReview,
      labelBlocked:     getStr('blocked')         ?? defaults.labelBlocked,
    };
  } catch { return defaults; }
}

const CONFIG = loadConfig();

// ── Suppression loader ────────────────────────────────────────────────────────
// Reads knowledge/false-positives.md and extracts glob-style path patterns.
// Sentinel filters its findings through these before computing stats.

function loadSuppressions() {
  try {
    const text = readFileSync(join(ROOT, 'knowledge', 'false-positives.md'), 'utf-8');
    return text.split('\n')
      .map(l => l.match(/^\s*-\s*pattern:\s*`?([^`\n]+)`?/))
      .filter(Boolean)
      .map(m => m[1].trim());
  } catch { return []; }
}

function matchesPattern(filePath, pattern) {
  const re = new RegExp(
    '^' +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // escape regex specials except * ?
      .replace(/\\\./g, '\\.')                 // keep escaped dots
      .replace(/\*\*/g, '.*')                  // ** → any path segment
      .replace(/\*/g,   '[^/]*')               // * → no slash wildcard
    + '$'
  );
  return re.test(filePath);
}

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const C = {
  reset:    '\x1b[0m',  bold:    '\x1b[1m',  dim:     '\x1b[2m',
  red:      '\x1b[31m', yellow:  '\x1b[33m', green:   '\x1b[32m',
  cyan:     '\x1b[36m', blue:    '\x1b[34m', magenta: '\x1b[35m',
  gray:     '\x1b[90m', white:   '\x1b[97m',
  bgRed:    '\x1b[41m', bgYellow:'\x1b[43m', bgGreen: '\x1b[42m',
};

const W = process.stdout.columns || 72;
const line = (ch = '─') => ch.repeat(W);

function box(title, color = C.cyan) {
  const inner = W - 4, titleLine = ` ${title} `;
  const left  = Math.floor((inner - titleLine.length) / 2);
  const right = inner - left - titleLine.length;
  return [
    `${color}╔${'═'.repeat(W - 2)}╗${C.reset}`,
    `${color}║${C.reset}  ${C.bold}${color}${'═'.repeat(left)}${titleLine}${'═'.repeat(right)}${C.reset}  ${color}║${C.reset}`,
    `${color}╚${'═'.repeat(W - 2)}╝${C.reset}`,
  ].join('\n');
}

function phase(n, label) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`\n${C.bold}${C.blue}▸ Phase ${n}${C.reset}  ${label}  ${C.gray}[${ts}]${C.reset}`);
}

function ok(msg)   { console.log(`  ${C.green}✓${C.reset}  ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}◆${C.reset}  ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset}  ${msg}`); }

function scoreBar(score) {
  const pct    = Math.min(1, Math.max(0, parseFloat(score) || 0));
  const filled = Math.round(pct * 20);
  const empty  = 20 - filled;
  const color  = pct > 0.7 ? C.red : pct > 0.3 ? C.yellow : C.green;
  return `${color}${'█'.repeat(filled)}${C.gray}${'░'.repeat(empty)}${C.reset}  ${C.bold}${pct.toFixed(2)}${C.reset}`;
}

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.GROQ_API_KEY;
if (!API_KEY) {
  console.error(`${C.red}✗  GROQ_API_KEY not set — get a free key at https://console.groq.com${C.reset}`);
  process.exit(1);
}

function resolveModel(envVal, label) {
  if (!envVal) {
    console.error(`${C.red}✗  ${label} not set in environment${C.reset}`);
    process.exit(1);
  }
  return envVal.includes(':') ? envVal.split(':').slice(1).join(':') : envVal;
}

// Model routing — never hardcoded, always from env
const MODEL_HEAVY_ENV = process.env.GITRAILS_MODEL_HEAVY || process.env.GITRAILS_MODEL;
const MODEL_LIGHT_ENV = process.env.GITRAILS_MODEL_LIGHT || process.env.GITRAILS_MODEL_HEAVY || process.env.GITRAILS_MODEL;

const MODELS = {
  heavy: resolveModel(MODEL_HEAVY_ENV, 'GITRAILS_MODEL_HEAVY'),
  light: resolveModel(MODEL_LIGHT_ENV, 'GITRAILS_MODEL_LIGHT'),
};

// Per-agent model routing — assign based on task complexity
const AGENT_MODELS = {
  sentinel: MODELS.heavy,  // OWASP analysis — needs full capability
  reviewer: MODELS.light,  // risk scoring — simple weighted formula
  scribe:   MODELS.heavy,  // doc generation — needs writing quality
  mirror:   MODELS.heavy,  // nuanced self-reflection
};

const BASE_URL = 'https://api.groq.com/openai/v1';

// GitHub integration
const GITHUB_TOKEN    = process.env.GITHUB_TOKEN;
const GITRAILS_REPO   = process.env.GITRAILS_REPO   || process.env.GITHUB_REPOSITORY;
const GITHUB_SHA      = process.env.GITHUB_SHA;

// ── Per-agent token budgets ───────────────────────────────────────────────────
// Rough: 1 token ≈ 4 chars. Budgets keep each agent well under Groq 6K TPM.
const BUDGETS = {
  sentinel: { maxChars: 12_000, maxFiles: 5 },  // diff + retrieval chunks
  reviewer: { maxChars:  6_000, maxFiles: 3 },  // gets sentinel JSON — already compact
  scribe:   { maxChars: 10_000, maxFiles: 4 },  // changed functions only
  mirror:   { maxChars:  3_200, maxFiles: 2 },  // session delta only — smallest input
};

// ── CLI args ──────────────────────────────────────────────────────────────────

const ARGV     = process.argv.slice(2);
const prArg    = ARGV.includes('--pr')     ? ARGV[ARGV.indexOf('--pr') + 1]     : process.env.GITRAILS_PR_NUMBER;
const diffArg  = ARGV.includes('--diff')   ? ARGV[ARGV.indexOf('--diff') + 1]   : null;
const fullScan = ARGV.includes('--full');
const targetArg = ARGV.includes('--target') ? ARGV[ARGV.indexOf('--target') + 1] : './';

// ── Shell utilities ───────────────────────────────────────────────────────────

function runCmd(cmd) {
  try {
    return execSync(cmd, {
      cwd: process.cwd(), encoding: 'utf-8',
      timeout: 30_000, maxBuffer: 4 * 1024 * 1024,
    }).trim();
  } catch (err) {
    return `ERROR: ${err.message}`.slice(0, 400);
  }
}

// ── Diff extraction ───────────────────────────────────────────────────────────

async function getDiffContext() {
  // Full scan mode — for CI environments without PR context
  if (fullScan) {
    info(`Full scan mode — target: ${C.bold}${targetArg}${C.reset}`);
    return { mode: 'full', files: [], diff: '', target: targetArg };
  }

  // PR mode — fetch file list from GitHub API, fall back to git diff
  if (prArg && GITHUB_TOKEN && GITRAILS_REPO) {
    info(`Fetching PR #${prArg} diff from GitHub API (${GITRAILS_REPO})...`);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITRAILS_REPO}/pulls/${prArg}/files`,
        {
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      if (res.ok) {
        const files   = await res.json();
        const changed = files.map(f => f.filename);
        const patches = files
          .filter(f => f.patch)
          .map(f => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
          .join('\n\n');
        ok(`${changed.length} file(s) changed in PR #${prArg}`);
        return { mode: 'pr', files: changed, diff: patches.slice(0, 8_000), prNumber: prArg };
      }
      warn(`GitHub API returned ${res.status} — falling back to git diff`);
    } catch (e) {
      warn(`GitHub API error: ${e.message} — falling back to git diff`);
    }
  }

  // Local git diff fallback
  const range = diffArg || 'HEAD~1..HEAD';
  info(`Using git diff ${range}`);
  const changedFiles = runCmd(`git diff ${range} --name-only`)
    .split('\n')
    .filter(f => f.trim() && existsSync(f));
  const diff = changedFiles.length
    ? runCmd(`git diff ${range} -- ${changedFiles.map(f => `"${f}"`).join(' ')}`).slice(0, 8_000)
    : '';
  ok(`${changedFiles.length} file(s) changed`);
  return { mode: 'diff', files: changedFiles, diff, range };
}

// ── Retrieval gate (vector index + code graph) ────────────────────────────────

function preSearch(query, topK = 3) {
  const raw = runCmd(`node retrieval/index.js --query "${query.replace(/"/g, '\\"')}" --top-k ${topK}`);
  try { return JSON.parse(raw); } catch { return []; }
}

function preHotspots(threshold = 5) {
  const raw = runCmd(`node retrieval/graph.js --hotspots --threshold ${threshold}`);
  try { return JSON.parse(raw); } catch { return []; }
}

function readSnippet(file, startLine, endLine, maxLines = 40) {
  const start = parseInt(startLine) || 1;
  const end   = Math.min(parseInt(endLine) || start + maxLines - 1, start + maxLines - 1);
  return runCmd(`sed -n "${start},${end}p" "${file}"`);
}

function buildAgentContext(diffCtx, agentQueries, agentName) {
  const budget = BUDGETS[agentName];
  const parts  = [];

  // 1. Diff section — always first so agents see exactly what changed
  if (diffCtx.diff) {
    const diffSlice = diffCtx.diff.slice(0, Math.floor(budget.maxChars * 0.35));
    parts.push('## Changed Files (git diff)\n```diff');
    parts.push(diffSlice);
    parts.push('```\n');
  }

  // 2. Retrieval gate — vector queries scoped to diff files where possible
  const seen       = new Map();
  const diffFiles  = diffCtx.files.length ? new Set(diffCtx.files) : null;

  for (const q of agentQueries) {
    const results = preSearch(q, 3);
    for (const r of results) {
      if (r.score < 0.15) continue;
      // Prefer files in the diff; allow high-scoring results from elsewhere
      if (diffFiles && !diffFiles.has(r.file) && r.score < 0.45) continue;
      if (!seen.has(r.file) || seen.get(r.file).score < r.score) {
        seen.set(r.file, r);
      }
    }
  }

  // Force-include diff files that retrieval didn't surface
  if (diffCtx.files) {
    for (const f of diffCtx.files) {
      if (!seen.has(f) && existsSync(f)) {
        seen.set(f, { file: f, start_line: '1', end_line: '40', score: 1.0 });
      }
    }
  }

  const topFiles   = [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, budget.maxFiles);

  const charsUsed  = parts.join('\n').length;
  const charsLeft  = budget.maxChars - charsUsed;
  const perFile    = topFiles.length ? Math.floor((charsLeft * 0.85) / topFiles.length) : 0;

  if (topFiles.length) {
    parts.push('## Relevant Code Chunks (retrieval-gated)\n');
    for (const r of topFiles) {
      const snippet = readSnippet(r.file, r.start_line, r.end_line).slice(0, perFile);
      parts.push(`### ${r.file}  (lines ${r.start_line}–${r.end_line}, score ${(r.score || 0).toFixed(3)})\n\`\`\``);
      parts.push(snippet);
      parts.push('```\n');
    }
  }

  // 3. Code graph hotspots — zero file reads, from adjacency JSON
  const hotspots = preHotspots(5);
  if (hotspots.length) {
    parts.push('## Complexity Hotspots\n');
    for (const h of hotspots.slice(0, 5)) {
      parts.push(`  - ${h.file}  complexity: ${h.complexity}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

// ── LLM call ──────────────────────────────────────────────────────────────────

let totalApiCalls = 0;

async function callLLM(messages, model) {
  const body = { model, messages, max_tokens: 2048, temperature: 0.1 };
  const res  = await fetch(`${BASE_URL}/chat/completions`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 400)}`);
  }
  totalApiCalls++;
  return res.json();
}

async function callWithRetry(messages, model) {
  try {
    return await callLLM(messages, model);
  } catch (err) {
    if (err.message.includes('429') || err.message.includes('413') ||
        err.message.includes('6000') || err.message.includes('12000')) {
      warn('Rate limit — waiting 62s then retrying...');
      await new Promise(r => setTimeout(r, 62_000));
      return await callLLM(messages, model);
    }
    throw err;
  }
}

// ── Agent: sentinel ───────────────────────────────────────────────────────────

async function runSentinel(diffCtx) {
  info(`${C.red}🔴 sentinel${C.reset}  model: ${C.gray}${AGENT_MODELS.sentinel}${C.reset}  budget: ${BUDGETS.sentinel.maxChars / 1000}K chars`);

  const queries = [
    'hardcoded credentials api key password secret token private key',
    'sql injection string concatenation user input query database',
    'eval exec innerHTML shell command injection dangerous function',
    'Math.random token session crypto weak algorithm md5 sha1',
    'debug true cors wildcard misconfiguration allow origin star',
  ];

  const context = buildAgentContext(diffCtx, queries, 'sentinel');

  const messages = [
    {
      role: 'system',
      content: `You are sentinel — gitrails' security scanner. SOD role: analyzer (read-only).
Detect OWASP Top 10 vulnerabilities and hardcoded secrets in the code provided.
Never invent findings. Only report what is actually present in the code shown.`,
    },
    {
      role: 'user',
      content: `Analyze the code below for security vulnerabilities.

${context}

Output in this EXACT format — nothing else before ---FINDINGS---:

---FINDINGS---
SEC-001 | CRITICAL | A07 | path/file.js:14 | description of issue | fix recommendation
(one pipe-delimited line per real finding)
---END---

Then on a single line:
SUMMARY_JSON: {"findings":N,"critical":N,"high":N,"medium":N,"low":N,"risk_hint":0.XX}

Rules: Only real findings from the code above. Do NOT call tools. Do NOT invent.`,
    },
  ];

  const resp = await callWithRetry(messages, AGENT_MODELS.sentinel);
  const raw  = resp.choices[0].message.content || '';

  // Parse structured findings
  const findingsBlock = raw.match(/---FINDINGS---\n([\s\S]*?)---END---/);
  const rows = findingsBlock
    ? findingsBlock[1].trim().split('\n').filter(l => l.trim() && l.includes('|'))
    : [];

  const findings = rows.map(r => {
    const [id, severity, owasp, location, description, fix] = r.split('|').map(p => p.trim());
    return { id, severity, owasp, location, description, fix };
  });

  // Apply suppression rules from knowledge/false-positives.md
  const suppressions = loadSuppressions();
  const suppressed   = [];
  const filtered     = findings.filter(f => {
    const filePart = (f.location || '').split(':')[0].trim();
    if (suppressions.some(p => matchesPattern(filePart, p))) {
      suppressed.push(f);
      return false;
    }
    return true;
  });
  if (suppressed.length) {
    info(`sentinel: suppressed ${suppressed.length} finding(s) via knowledge/false-positives.md`);
  }

  // Compute stats from filtered findings (suppression-aware — reviewer inherits these)
  const jsonMatch = raw.match(/SUMMARY_JSON:\s*(\{[^\n]+\})/);
  let stats = {
    findings: filtered.length,
    critical: filtered.filter(f => f.severity === 'CRITICAL').length,
    high:     filtered.filter(f => f.severity === 'HIGH').length,
    medium:   filtered.filter(f => f.severity === 'MEDIUM').length,
    low:      filtered.filter(f => f.severity === 'LOW').length,
    risk_hint: 0,
  };
  if (jsonMatch) {
    try {
      const j = JSON.parse(jsonMatch[1]);
      // Only use LLM-parsed counts if no suppressions were applied
      if (!suppressed.length) Object.assign(stats, j);
    } catch { /* use derived */ }
  }
  stats.risk_hint = Math.min(1,
    stats.critical * 0.5 + stats.high * 0.25 + stats.medium * 0.1
  );

  const countLine = [
    stats.critical ? `${C.red}${C.bold}${stats.critical} CRITICAL${C.reset}` : '',
    stats.high     ? `${C.yellow}${stats.high} HIGH${C.reset}` : '',
    stats.medium   ? `${C.cyan}${stats.medium} MEDIUM${C.reset}` : '',
    stats.low      ? `${C.green}${stats.low} LOW${C.reset}` : '',
  ].filter(Boolean).join('  ');
  ok(`sentinel: ${stats.findings} finding(s)${countLine ? '  ' + countLine : ''}`);

  return {
    agent:    'sentinel',
    findings: filtered,
    stats,
    rawText:  raw,
    summary:  `${stats.findings} finding(s): ${stats.critical} critical, ${stats.high} high, ${stats.medium} medium, ${stats.low} low`,
  };
}

// ── Agent: reviewer ───────────────────────────────────────────────────────────

async function runReviewer(diffCtx, sentinelResult) {
  info(`${C.yellow}🟡 reviewer${C.reset}  model: ${C.gray}${AGENT_MODELS.reviewer}${C.reset}  budget: ${BUDGETS.reviewer.maxChars / 1000}K chars`);

  // Structured handoff — reviewer gets sentinel's JSON, NOT the raw code sentinel saw.
  // This is the key production optimization: ~60% fewer tokens for reviewer.
  const sentinelHandoff = JSON.stringify({
    agent:    'sentinel',
    findings: sentinelResult.findings,
    stats:    sentinelResult.stats,
    summary:  sentinelResult.summary,
  }, null, 2);

  const queries = [
    'null dereference undefined property access missing null check',
    'missing error handling bare catch promise rejection unhandled',
    'missing input validation user input sanitization',
  ];

  const context = buildAgentContext(diffCtx, queries, 'reviewer');

  const messages = [
    {
      role: 'system',
      content: `You are reviewer — gitrails' code quality analyst. SOD role: analyzer (read-only).
Risk formula: 0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs
Rule: if sentinel reported any CRITICAL findings, risk_score MUST be ≥ 0.7 and verdict MUST be BLOCKED.`,
    },
    {
      role: 'user',
      content: `Sentinel's structured output (JSON handoff — do not re-read files):
\`\`\`json
${sentinelHandoff}
\`\`\`

Code context (diff-gated, for bug + complexity assessment only):
${context}

Apply the risk formula. Output in this EXACT format:

---RISK---
security_severity:  0.XX  (reason)
bug_probability:    0.XX  (reason)
complexity_delta:   0.XX  (reason)
test_coverage_gap:  0.XX  (reason)
documentation_debt: 0.XX  (reason)
RISK_SCORE:         0.XX
VERDICT:            BLOCKED | NEEDS_REVIEW | APPROVED
---END---

Then: SUMMARY_JSON: {"risk_score":0.XX,"verdict":"BLOCKED|NEEDS_REVIEW|APPROVED"}

Do NOT re-read any files. Use only what is shown above.`,
    },
  ];

  const resp = await callWithRetry(messages, AGENT_MODELS.reviewer);
  const raw  = resp.choices[0].message.content || '';

  const scoreMatch  = raw.match(/RISK_SCORE:\s*([\d.]+)/);
  const verdictMatch = raw.match(/VERDICT:\s*(BLOCKED|NEEDS_REVIEW|APPROVED)/);
  const jsonMatch    = raw.match(/SUMMARY_JSON:\s*(\{[^\n]+\})/);

  let riskScore = scoreMatch  ? parseFloat(scoreMatch[1])    : sentinelResult.stats.risk_hint;
  let verdict   = verdictMatch ? verdictMatch[1]             : null;

  if (jsonMatch) {
    try {
      const j = JSON.parse(jsonMatch[1]);
      if (j.risk_score) riskScore = j.risk_score;
      if (j.verdict)    verdict   = j.verdict;
    } catch { /* use regex-parsed values */ }
  }

  // Enforce rule: CRITICAL findings → BLOCKED (always overrides LLM)
  if (sentinelResult.stats.critical > 0 && verdict !== 'BLOCKED') {
    verdict   = 'BLOCKED';
    riskScore = Math.max(riskScore, 0.7);
  }

  // Enforce rule: numeric score always wins over LLM's stated verdict.
  // LLMs sometimes say NEEDS_REVIEW on low scores — the formula is ground truth.
  const thresholdVerdict = riskScore > CONFIG.requireReview ? 'BLOCKED'
                         : riskScore > CONFIG.autoApprove   ? 'NEEDS_REVIEW'
                         :                                    'APPROVED';
  // Only use LLM verdict if it is *stricter* than the threshold verdict
  // (i.e. LLM flagged something the score didn't catch — trust that).
  // Never let LLM downgrade a clean score to NEEDS_REVIEW without numeric justification.
  const verdictOrder = { APPROVED: 0, NEEDS_REVIEW: 1, BLOCKED: 2 };
  if (!verdict || verdictOrder[verdict] < verdictOrder[thresholdVerdict]) {
    verdict = thresholdVerdict;
  }

  const verdictBadge = verdict === 'BLOCKED'      ? `${C.red}${C.bold}⛔ BLOCKED${C.reset}`
                     : verdict === 'NEEDS_REVIEW' ? `${C.yellow}⚠ NEEDS REVIEW${C.reset}`
                     :                              `${C.green}✓ APPROVED${C.reset}`;
  ok(`reviewer: ${scoreBar(riskScore)}   ${verdictBadge}`);

  return {
    agent:     'reviewer',
    riskScore,
    verdict,
    rawText:   raw,
    summary:   `Risk: ${riskScore.toFixed(2)} — ${verdict}`,
  };
}

// ── Agent: scribe ─────────────────────────────────────────────────────────────

async function runScribe(diffCtx) {
  info(`${C.green}🟢 scribe${C.reset}  model: ${C.gray}${AGENT_MODELS.scribe}${C.reset}  budget: ${BUDGETS.scribe.maxChars / 1000}K chars`);

  const queries = [
    'public function exported function missing documentation jsdoc',
    'async function class method undocumented exported api endpoint',
  ];

  const context = buildAgentContext(diffCtx, queries, 'scribe');

  const messages = [
    {
      role: 'system',
      content: `You are scribe — gitrails' documentation generator. SOD role: writer.
Generate accurate JSDoc for undocumented public/exported functions.
NEVER invent behavior not visible in the code. Only document what exists.`,
    },
    {
      role: 'user',
      content: `${context}

Find public/exported functions lacking JSDoc. Output in this format:

---DOCS---
FILE: path/to/file.js
FUNCTION: functionName
JSDOC:
/**
 * Brief description based only on observable code behavior.
 * @param {type} paramName - description
 * @returns {type} description
 */
---
(repeat block for each undocumented function)
---END---

Then: SUMMARY_JSON: {"documented":N}

Only document functions visible above. Do NOT call tools. Do NOT invent.`,
    },
  ];

  const resp = await callWithRetry(messages, AGENT_MODELS.scribe);
  const raw  = resp.choices[0].message.content || '';

  const docsMatch = raw.match(/---DOCS---\n([\s\S]*?)---END---/);
  const count     = docsMatch ? (docsMatch[1].match(/^FUNCTION:/gm) || []).length : 0;

  ok(`scribe: ${count} function(s) documented`);

  return {
    agent:       'scribe',
    documented:  count,
    rawText:     raw,
    summary:     `${count} function(s) documented`,
  };
}

// ── Agent: mirror ─────────────────────────────────────────────────────────────

async function runMirror(sentinelResult, reviewerResult, scribeResult) {
  info(`${C.magenta}🪞 mirror${C.reset}  model: ${C.gray}${AGENT_MODELS.mirror}${C.reset}  budget: ${BUDGETS.mirror.maxChars / 1000}K chars`);

  // Mirror receives ONLY the session delta — structured JSON from all three agents.
  // This is the smallest possible input (~1K chars), keeping mirror well under TPM.
  const sessionDelta = JSON.stringify({
    sentinel: { findings: sentinelResult.findings, summary: sentinelResult.summary },
    reviewer: { risk_score: reviewerResult.riskScore, verdict: reviewerResult.verdict, summary: reviewerResult.summary },
    scribe:   { documented: scribeResult.documented, summary: scribeResult.summary },
  }, null, 2);

  const messages = [
    {
      role: 'system',
      content: `You are mirror — gitrails' conscience. SOD role: auditor (read-only, propose only).
Review this session's results for false positives and learning opportunities.
NEVER modify knowledge/ directly. Only propose changes via PR description.`,
    },
    {
      role: 'user',
      content: `Session delta (structured handoff — all agent outputs this session):
\`\`\`json
${sessionDelta}
\`\`\`

Review for false positives and propose learnings:

---LEARNING---
FALSE_POSITIVE: (describe any finding that looks like a false positive and why)
SUPPRESS_RULE: (exact rule to add to knowledge/false-positives.md, or NONE)
PROPOSE_PR: (describe the PR to knowledge/ — what to add/change)
OBSERVATION: (what gitrails did well or should improve next time)
CONFIDENCE: HIGH | MEDIUM | LOW
---END---

SUMMARY_JSON: {"false_positives":N,"observations":N,"suppressions":N}

Do NOT call any tools. Analyze only the session delta above.`,
    },
  ];

  const resp = await callWithRetry(messages, AGENT_MODELS.mirror);
  const raw  = resp.choices[0].message.content || '';

  const learnBlock  = raw.match(/---LEARNING---\n([\s\S]*?)---END---/);
  const fpCount     = learnBlock ? (learnBlock[1].match(/^FALSE_POSITIVE:/gm) || []).length : 0;
  const obsCount    = learnBlock ? (learnBlock[1].match(/^OBSERVATION:/gm)    || []).length : 0;
  const supCount    = learnBlock ? (learnBlock[1].match(/^SUPPRESS_RULE:/gm)  || []).length : 0;

  const parts = [];
  if (fpCount)  parts.push(`${fpCount} false positive(s)`);
  if (supCount) parts.push(`${supCount} suppression(s) proposed`);
  if (obsCount) parts.push(`${obsCount} observation(s)`);
  ok(`mirror: ${parts.join('  ·  ') || 'no proposals'}`);

  return {
    agent:          'mirror',
    falsePositives: fpCount,
    observations:   obsCount,
    suppressions:   supCount,
    rawText:        raw,
    summary:        parts.join('  ·  ') || 'no proposals',
  };
}

// ── GitHub API integration ────────────────────────────────────────────────────

function buildPRComment(sentinel, reviewer, scribe, mirror) {
  const verdictEmoji = reviewer.verdict === 'BLOCKED'      ? '🔴'
                     : reviewer.verdict === 'NEEDS_REVIEW' ? '🟡' : '🟢';
  const verdictLabel = reviewer.verdict === 'BLOCKED'      ? '🔴 **BLOCKED**'
                     : reviewer.verdict === 'NEEDS_REVIEW' ? '🟡 **NEEDS REVIEW**'
                     :                                       '🟢 **APPROVED**';

  let md = `## gitrails Security & Quality Review\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| **Verdict** | ${verdictLabel} |\n`;
  md += `| **Risk Score** | \`${reviewer.riskScore.toFixed(2)}\` |\n`;
  md += `| **Security Findings** | ${sentinel.stats.findings} (${sentinel.stats.critical} critical, ${sentinel.stats.high} high) |\n`;
  md += `| **Docs Generated** | ${scribe.documented} function(s) |\n`;
  md += `| **Mirror** | ${mirror.summary} |\n\n`;

  if (sentinel.findings.length) {
    md += `### Security Findings\n\n`;
    md += `| ID | Severity | OWASP | Location | Description | Fix |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const f of sentinel.findings) {
      md += `| ${f.id || '—'} | ${f.severity || '—'} | ${f.owasp || '—'} | \`${f.location || '—'}\` | ${f.description || '—'} | ${f.fix || '—'} |\n`;
    }
    md += '\n';
  } else {
    md += `### Security Findings\n\nNo findings. ${verdictEmoji}\n\n`;
  }

  if (mirror.rawText.includes('---LEARNING---')) {
    const learnBlock = mirror.rawText.match(/---LEARNING---\n([\s\S]*?)---END---/);
    if (learnBlock) {
      md += `<details><summary>🪞 mirror observations</summary>\n\n\`\`\`\n${learnBlock[1].trim()}\n\`\`\`\n</details>\n\n`;
    }
  }

  md += `---\n*gitrails · ${totalApiCalls} API call(s) · sentinel · reviewer · scribe · mirror*\n`;
  return md;
}

async function postPRComment(prNumber, body) {
  if (!GITHUB_TOKEN || !GITRAILS_REPO || !prNumber) {
    info('GitHub PR comment skipped — GITHUB_TOKEN / GITRAILS_REPO / PR number not set');
    return;
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITRAILS_REPO}/issues/${prNumber}/comments`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept':        'application/vnd.github.v3+json',
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );
    if (res.ok) ok('PR comment posted');
    else        warn(`PR comment failed: HTTP ${res.status}`);
  } catch (e) {
    warn(`PR comment error: ${e.message}`);
  }
}

async function createGitHubCheck(verdict, summary) {
  if (!GITHUB_TOKEN || !GITRAILS_REPO || !GITHUB_SHA) {
    info('GitHub Check skipped — GITHUB_SHA not available');
    return;
  }
  const conclusion = verdict === 'BLOCKED'      ? 'failure'
                   : verdict === 'NEEDS_REVIEW' ? 'neutral'
                   :                              'success';
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITRAILS_REPO}/check-runs`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept':        'application/vnd.github.v3+json',
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          name:       'gitrails',
          head_sha:   GITHUB_SHA,
          status:     'completed',
          conclusion,
          output: { title: `gitrails: ${verdict}`, summary },
        }),
      }
    );
    if (res.ok) ok(`GitHub Check: ${conclusion}`);
    else        warn(`GitHub Check failed: HTTP ${res.status}`);
  } catch (e) {
    warn(`GitHub Check error: ${e.message}`);
  }
}

// ── Final summary table ───────────────────────────────────────────────────────

function renderSummary(sentinel, reviewer, scribe, mirror) {
  const verdictEmoji = reviewer.verdict === 'BLOCKED'      ? '⛔'
                     : reviewer.verdict === 'NEEDS_REVIEW' ? '⚠'  : '✓';

  console.log('\n' + box('gitrails · production scan complete', C.cyan));
  console.log();

  const col1 = 22, col2 = 12;
  console.log(`  ${C.bold}${'Agent'.padEnd(col1)}${'API Calls'.padEnd(col2)}Result${C.reset}`);
  console.log(`  ${C.gray}${line('─').slice(0, W - 4)}${C.reset}`);

  const rows = [
    { icon: '🔴', name: 'sentinel', calls: 1, result: sentinel.summary },
    { icon: '🟡', name: 'reviewer', calls: 1, result: reviewer.summary },
    { icon: '🟢', name: 'scribe',   calls: 1, result: scribe.summary   },
    { icon: '🪞', name: 'mirror',   calls: 1, result: mirror.summary   },
  ];
  for (const r of rows) {
    console.log(`  ${`${r.icon} ${r.name}`.padEnd(col1)}${String(r.calls).padEnd(col2)}${r.result}`);
  }

  console.log(`  ${C.gray}${line('─').slice(0, W - 4)}${C.reset}`);
  console.log(`  ${C.bold}${'Total'.padEnd(col1)}${String(totalApiCalls).padEnd(col2)}${totalApiCalls} API call(s)  ·  ${verdictEmoji} ${reviewer.verdict}${C.reset}`);
  console.log();
}

// ── Triage ────────────────────────────────────────────────────────────────────
// Pure in-process priority assignment — zero LLM calls.
// Uses the retrieval gate (already warmed by buildAgentContext calls) to assign
// sentinel/reviewer priorities based on auth file changes and complexity hotspots.

function runTriage(diffCtx) {
  const secResults = preSearch('hardcoded credentials authentication secret token', 5);
  const hotspots   = preHotspots(5);
  const hotspotSet = new Set(hotspots.map(h => h.file));
  const changedSet = new Set(diffCtx.files || []);

  const authChanged = (diffCtx.files || []).filter(f =>
    /auth|config|secret|credential|key|password/i.test(f)
  );
  const hotspotChanged = (diffCtx.files || []).filter(f => hotspotSet.has(f));

  // Promote top-scoring retrieval hits that overlap the diff
  const topSecFile = secResults.find(r => changedSet.has(r.file));

  const sentinelPriority = (authChanged.length > 0 || topSecFile) ? 'CRITICAL' : 'STANDARD';
  const reviewerPriority = hotspotChanged.length > 0              ? 'HIGH'     : 'STANDARD';

  info(`triage: sentinel=${C.bold}${sentinelPriority}${C.reset}  reviewer=${C.bold}${reviewerPriority}${C.reset}  scribe=STANDARD`);

  return {
    sentinel: { priority: sentinelPriority, scope: diffCtx.files || [], authFiles: authChanged },
    reviewer: { priority: reviewerPriority, scope: diffCtx.files || [], hotspots: hotspots.slice(0, 5) },
    scribe:   { priority: 'STANDARD',       scope: diffCtx.files || [] },
  };
}

// ── PR label application ──────────────────────────────────────────────────────
// Applies a single gitrails/* label based on verdict. Removes any previous
// gitrails/* label first so labels never stack.
// Prerequisite: create labels in GitHub repo settings once before first run.
//   gitrails/approved  · gitrails/needs-review  · gitrails/blocked

async function applyPRLabel(verdict) {
  if (!GITHUB_TOKEN || !GITRAILS_REPO || !prArg) {
    info('PR label skipped — GITHUB_TOKEN / GITRAILS_REPO / PR number not available');
    return;
  }
  const label = verdict === 'BLOCKED'      ? CONFIG.labelBlocked
              : verdict === 'NEEDS_REVIEW' ? CONFIG.labelNeedsReview
              :                              CONFIG.labelApproved;
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept':        'application/vnd.github.v3+json',
    'Content-Type':  'application/json',
  };
  try {
    // Remove any existing gitrails/* labels to prevent stacking
    const existing = await fetch(
      `https://api.github.com/repos/${GITRAILS_REPO}/issues/${prArg}/labels`,
      { headers }
    );
    if (existing.ok) {
      const labels = await existing.json();
      for (const l of labels.filter(l => l.name.startsWith('gitrails/'))) {
        await fetch(
          `https://api.github.com/repos/${GITRAILS_REPO}/issues/${prArg}/labels/${encodeURIComponent(l.name)}`,
          { method: 'DELETE', headers }
        );
      }
    }
    // Apply the verdict label
    const res = await fetch(
      `https://api.github.com/repos/${GITRAILS_REPO}/issues/${prArg}/labels`,
      { method: 'POST', headers, body: JSON.stringify({ labels: [label] }) }
    );
    if (res.ok) ok(`PR label applied: ${C.bold}${label}${C.reset}`);
    else        warn(`PR label failed: HTTP ${res.status} — create "${label}" label in GitHub repo settings first`);
  } catch (e) {
    warn(`PR label error: ${e.message}`);
  }
}

// ── Session logging ───────────────────────────────────────────────────────────
// Appends a structured session block to memory/runtime/dailylog.md and
// prepends a one-line bullet to memory/MEMORY.md (capped at 200 lines).
// Zero API calls — pure file I/O.

function writeSessionLog(sentinel, reviewer, scribe, mirror) {
  const sessionId = process.env.GITRAILS_SESSION_ID || 'local';
  const date      = new Date().toISOString();
  const prNum     = prArg || 'local';

  // ── 1. Append to memory/runtime/dailylog.md ──
  const findingsRows = sentinel.findings.slice(0, 10).map(f =>
    `| ${f.id||'—'} | sentinel | ${f.severity||'—'} | ${(f.location||'—').split(':')[0]} | ${(f.location||'—').split(':')[1]||'—'} | ${(f.description||'—').slice(0, 60)} |`
  ).join('\n');

  const learningBlock = mirror.rawText.match(/---LEARNING---\n([\s\S]*?)---END---/)?.[1]?.trim() ?? 'no proposals';

  const logEntry = `
## Session ${sessionId} — ${date}
PR: #${prNum}  │  Verdict: **${reviewer.verdict}**  │  Risk: ${reviewer.riskScore?.toFixed(2) ?? '—'}

### Findings
| finding_id | agent | severity | file | line | description |
|------------|-------|----------|------|------|-------------|
${findingsRows || '| — | sentinel | — | — | — | no findings |'}

### mirror
\`\`\`
${learningBlock}
\`\`\`
`;

  try {
    appendFileSync(join(ROOT, 'memory', 'runtime', 'dailylog.md'), logEntry, 'utf-8');
    ok('Session logged → memory/runtime/dailylog.md');
  } catch (e) { warn(`dailylog write failed: ${e.message}`); }

  // ── 2. Prepend bullet to memory/MEMORY.md → keep ≤200 lines ──
  const memPath  = join(ROOT, 'memory', 'MEMORY.md');
  const memLine  = `- ${date.slice(0, 10)} PR #${prNum}: ${reviewer.verdict} ${reviewer.riskScore?.toFixed(2) ?? '—'} — ${sentinel.stats.findings} finding(s), ${scribe.documented} doc(s)\n`;
  try {
    const mem     = readFileSync(memPath, 'utf-8');
    const updated = mem.replace(/## Recent Sessions\n/, `## Recent Sessions\n${memLine}`);
    // Enforce 200-line cap per MEMORY.md's own spec
    writeFileSync(memPath, updated.split('\n').slice(0, 200).join('\n'), 'utf-8');
    ok('Session appended → memory/MEMORY.md');
  } catch (e) { warn(`MEMORY.md write failed: ${e.message}`); }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const ts = new Date().toLocaleString('en-US', { hour12: false });
  console.log(`\n${C.bold}${C.cyan}gitrails production scanner${C.reset}  ${C.gray}${ts}${C.reset}`);
  console.log(`${C.gray}Heavy: ${MODEL_HEAVY_ENV}  │  Light: ${MODEL_LIGHT_ENV}${C.reset}`);
  if (prArg)    console.log(`${C.gray}PR: #${prArg}  │  Repo: ${GITRAILS_REPO || 'local'}${C.reset}`);
  if (diffArg)  console.log(`${C.gray}Diff: ${diffArg}${C.reset}`);
  if (fullScan) console.log(`${C.gray}Mode: full scan  │  Target: ${targetArg}${C.reset}`);
  console.log(C.gray + line() + C.reset);

  // Phase 1 — diff extraction + retrieval gate setup
  phase(1, 'Diff extraction');
  const diffCtx = await getDiffContext();

  // Phase 2 — triage (priority assignment, zero LLM calls)
  phase(2, 'Triage');
  const triagePlan = runTriage(diffCtx);

  // Phase 3 — agent chain (parallel where independent, structured handoffs)
  phase(3, `Agent chain  [heavy: ${MODELS.heavy}  │  light: ${MODELS.light}]`);
  console.log();

  // sentinel and scribe are independent — run in parallel to save wall-clock time
  // reviewer depends on sentinel's JSON handoff — starts after both resolve
  // mirror depends on all three — runs last
  const [sentinel, scribe] = await Promise.all([
    runSentinel(diffCtx),
    runScribe(diffCtx),
  ]);

  const reviewer = await runReviewer(diffCtx, sentinel);
  const mirror   = await runMirror(sentinel, reviewer, scribe);

  // Phase 4 — GitHub integration
  phase(4, 'GitHub integration');
  const comment = buildPRComment(sentinel, reviewer, scribe, mirror);
  await postPRComment(prArg, comment);
  await createGitHubCheck(reviewer.verdict, reviewer.summary);
  await applyPRLabel(reviewer.verdict);

  // Persist session to memory/
  writeSessionLog(sentinel, reviewer, scribe, mirror);

  // Final summary
  renderSummary(sentinel, reviewer, scribe, mirror);

  // Exit 1 on BLOCKED so the GitHub Action fails the check
  if (reviewer.verdict === 'BLOCKED') {
    console.log(`${C.red}${C.bold}Exiting 1 — PR is BLOCKED by gitrails${C.reset}\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`\n${C.red}Fatal:${C.reset}`, err.message);
  process.exit(1);
});
