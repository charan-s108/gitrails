#!/usr/bin/env node
/**
 * gitrails pr-scan — production multi-agent code review runner
 *
 * Architecture: diff-first → retrieval gate → parallel agent chain
 *               → structured handoffs → PR comment + GitHub Check + label
 *
 * Bypasses gitclaw SDK entirely — calls Groq API directly (~250-token system
 * prompt vs ~42K for gitclaw), stays within Groq free tier TPM limits.
 *
 * Modes:
 *   node scripts/pr-scan.js --pr 42          PR review (GitHub Actions)
 *   node scripts/pr-scan.js --diff HEAD~1..HEAD   local diff
 *   node scripts/pr-scan.js --full [--target dir] full repo scan
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Config loader ─────────────────────────────────────────────────────────────

function loadConfig() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'default';
  const cfgPath = join(ROOT, 'config', `${env}.yaml`);
  const defaults = {
    autoApprove:      0.3,
    requireReview:    0.7,
    labelApproved:    'gitrails/approved',
    labelNeedsReview: 'gitrails/needs-review',
    labelBlocked:     'gitrails/blocked',
  };
  try {
    const text = readFileSync(cfgPath, 'utf-8');
    const num = (k) => { const m = text.match(new RegExp(`^\\s*${k}:\\s*([\\d.]+)`, 'm')); return m ? parseFloat(m[1]) : null; };
    const str = (k) => { const m = text.match(new RegExp(`^\\s*${k}:\\s*(.+)`, 'm')); return m ? m[1].trim() : null; };
    return {
      autoApprove:      num('auto_approve')   ?? defaults.autoApprove,
      requireReview:    num('require_review') ?? defaults.requireReview,
      labelApproved:    str('approved')       ?? defaults.labelApproved,
      labelNeedsReview: str('needs_review')   ?? defaults.labelNeedsReview,
      labelBlocked:     str('blocked')        ?? defaults.labelBlocked,
    };
  } catch { return defaults; }
}

const CONFIG = loadConfig();

// ── Suppression loader ────────────────────────────────────────────────────────

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
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*') +
    '$'
  );
  return re.test(filePath);
}

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m',
  cyan: '\x1b[36m', blue: '\x1b[34m', magenta: '\x1b[35m',
  gray: '\x1b[90m', white: '\x1b[97m',
  bgRed: '\x1b[41m', bgYellow: '\x1b[43m', bgGreen: '\x1b[42m',
};
const W     = process.stdout.columns || 80;
const hline = (ch = '─') => ch.repeat(W);

function phase(n, label) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`\n${C.bold}${C.blue}▸ Phase ${n}${C.reset}  ${label}  ${C.gray}[${ts}]${C.reset}`);
}
function ok(msg)   { console.log(`  ${C.green}✓${C.reset}  ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}◆${C.reset}  ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset}  ${msg}`); }
function fail(msg) { console.log(`  ${C.red}✗${C.reset}  ${msg}`); }

function scoreBar(score) {
  const pct   = Math.min(1, Math.max(0, parseFloat(score) || 0));
  const filled = Math.round(pct * 20);
  const color  = pct > 0.7 ? C.red : pct > 0.3 ? C.yellow : C.green;
  return `${color}${'█'.repeat(filled)}${'░'.repeat(20 - filled)}${C.reset} ${C.bold}${pct.toFixed(2)}${C.reset}`;
}

// ── Model routing ─────────────────────────────────────────────────────────────

const MODELS = {
  heavy: (process.env.GITRAILS_MODEL_HEAVY || 'groq:llama-3.3-70b-versatile').replace(/^groq:/, ''),
  light: (process.env.GITRAILS_MODEL_LIGHT || 'groq:llama-3.1-8b-instant').replace(/^groq:/, ''),
};
const AGENT_MODELS = {
  sentinel: MODELS.heavy,
  reviewer: MODELS.light,
  scribe:   MODELS.heavy,
  mirror:   MODELS.heavy,
};

const API_KEY  = process.env.GROQ_API_KEY;
const BASE_URL = 'https://api.groq.com/openai/v1';

if (!API_KEY) {
  console.error(`${C.red}✗  GROQ_API_KEY not set${C.reset}  — get free key at https://console.groq.com`);
  process.exit(1);
}

// ── Per-agent token budgets ───────────────────────────────────────────────────

const BUDGETS = {
  sentinel: { maxChars: 12_000, maxFiles: 5 },
  reviewer: { maxChars:  6_000, maxFiles: 3 },
  scribe:   { maxChars: 10_000, maxFiles: 4 },
  mirror:   { maxChars:  3_200, maxFiles: 2 },
};

// ── Result cache ─────────────────────────────────────────────────────────────

const CACHE_DIR = join(ROOT, '.cache');

function getCacheKey(diffCtx) {
  return createHash('sha1').update(diffCtx.raw || diffCtx.diff || '').digest('hex').slice(0, 16);
}

function loadCache(key) {
  try {
    const p = join(CACHE_DIR, `pr-${key}.json`);
    if (!existsSync(p)) return null;
    const data = JSON.parse(readFileSync(p, 'utf-8'));
    if (Date.now() - data.ts > 24 * 60 * 60 * 1000) return null; // >24h old
    return data;
  } catch { return null; }
}

function saveCache(key, result) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, `pr-${key}.json`), JSON.stringify({ ...result, ts: Date.now() }), 'utf-8');
  } catch { /* non-fatal */ }
}

// ── Groq API call with retry ──────────────────────────────────────────────────

async function callGroq(model, messages, maxTokens = 2048) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.1 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content || '';
}

function isRateLimit(err) {
  return err.message.includes('429') || err.message.includes('quota') ||
         err.message.includes('6000') || err.message.includes('12000');
}

async function callWithRetry(model, messages, maxTokens = 2048) {
  try {
    return await callGroq(model, messages, maxTokens);
  } catch (err) {
    if (isRateLimit(err)) {
      warn(`Rate limit on ${model} — falling back to light model immediately`);
      try {
        return await callGroq(MODELS.light, messages, maxTokens);
      } catch (err2) {
        if (isRateLimit(err2)) {
          warn('Light model also rate-limited — waiting 62s...');
          await new Promise(r => setTimeout(r, 62_000));
          return await callGroq(MODELS.light, messages, maxTokens);
        }
        throw err2;
      }
    }
    throw err;
  }
}

// ── GitHub API helpers ────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO         = process.env.GITRAILS_REPO;
const GITHUB_API   = 'https://api.github.com';

async function ghFetch(path, method = 'GET', body = null) {
  if (!GITHUB_TOKEN) return null;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept':        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type':  'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${GITHUB_API}${path}`, opts);
    if (!res.ok && res.status !== 404) {
      warn(`GitHub API ${method} ${path} → ${res.status}`);
    }
    return res.ok ? res.json() : null;
  } catch (e) {
    warn(`GitHub API error: ${e.message.slice(0, 100)}`);
    return null;
  }
}

// ── Diff extraction ───────────────────────────────────────────────────────────

const ARGV     = process.argv.slice(2);
const PR_NUM   = ARGV.includes('--pr')   ? ARGV[ARGV.indexOf('--pr') + 1]   : null;
const DIFF_REF = ARGV.includes('--diff') ? ARGV[ARGV.indexOf('--diff') + 1] : null;
const FULL     = ARGV.includes('--full');
const TARGET   = ARGV.includes('--target') ? ARGV[ARGV.indexOf('--target') + 1] : './';
const SESSION  = process.env.GITRAILS_SESSION_ID || 'local';

function shell(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  } catch (e) {
    return e.stdout || e.stderr || '';
  }
}

async function getDiff() {
  // PR mode — fetch diff via GitHub API
  if (PR_NUM && REPO && GITHUB_TOKEN) {
    const files = await ghFetch(`/repos/${REPO}/pulls/${PR_NUM}/files`);
    if (files && files.length) {
      const fileList = files.map(f => f.filename);
      const patches  = files.map(f =>
        `### ${f.filename} (+${f.additions}/-${f.deletions})\n${(f.patch || '').slice(0, 1500)}`
      ).join('\n\n');
      ok(`PR #${PR_NUM}  ${files.length} file(s) changed`);
      return { mode: 'pr', pr: PR_NUM, files: fileList, diff: patches, raw: patches };
    }
  }

  // Local diff mode
  if (DIFF_REF) {
    const diff = shell(`git diff ${DIFF_REF} -- . ':(exclude)node_modules' ':(exclude)knowledge/vector-index'`);
    const files = shell(`git diff --name-only ${DIFF_REF}`).trim().split('\n').filter(Boolean);
    ok(`Diff ${DIFF_REF}  ${files.length} file(s) changed`);
    return { mode: 'diff', ref: DIFF_REF, files, diff: diff.slice(0, 40_000), raw: diff };
  }

  // Full scan mode
  if (FULL) {
    const files = shell(`git ls-files --cached --others --exclude-standard`).trim().split('\n').filter(Boolean);
    const sample = files.slice(0, 30).map(f => {
      try { return `### ${f}\n${readFileSync(join(ROOT, f), 'utf-8').slice(0, 800)}`; } catch { return ''; }
    }).filter(Boolean).join('\n\n');
    ok(`Full scan  ${files.length} tracked file(s)`);
    return { mode: 'full', files, diff: sample.slice(0, 40_000), raw: sample };
  }

  // Fallback — last commit diff
  const diff  = shell('git diff HEAD~1..HEAD -- . \':(exclude)node_modules\'');
  const files = shell('git diff --name-only HEAD~1..HEAD').trim().split('\n').filter(Boolean);
  ok(`Fallback diff HEAD~1..HEAD  ${files.length} file(s)`);
  return { mode: 'diff', ref: 'HEAD~1..HEAD', files, diff: diff.slice(0, 40_000), raw: diff };
}

// ── Retrieval helpers ─────────────────────────────────────────────────────────

function preSearch(query, topK = 5) {
  const raw = shell(`node retrieval/index.js --query "${query.replace(/"/g, '\\"')}" --top-k ${topK}`);
  try { return JSON.parse(raw); } catch { return []; }
}

function preHotspots(n = 5) {
  const raw = shell(`node retrieval/graph.js --hotspots --threshold 8`);
  try { return JSON.parse(raw).slice(0, n); } catch { return []; }
}

function readSnippet(file, start, end) {
  const s = parseInt(start) || 1;
  const e = Math.min(parseInt(end) || s + 39, s + 79); // max 80 lines
  return shell(`sed -n "${s},${e}p" "${file}"`).slice(0, 1_500);
}

function buildAgentContext(agentName, diffCtx, extraResults = []) {
  const budget = BUDGETS[agentName];
  const lines  = [];

  // Diff summary — always included
  lines.push(`## Changed Files\n${(diffCtx.files || []).map(f => `- ${f}`).join('\n')}\n`);

  // Diff patch — capped to leave room for snippets
  const diffBudget = Math.floor(budget.maxChars * 0.5);
  lines.push(`## Diff\n\`\`\`\n${(diffCtx.diff || '').slice(0, diffBudget)}\n\`\`\`\n`);

  // Retrieval snippets
  const seen = new Map();
  for (const r of extraResults) {
    if (!seen.has(r.file) || seen.get(r.file).score < r.score) seen.set(r.file, r);
  }
  const topFiles = [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, budget.maxFiles);

  if (topFiles.length) {
    lines.push('## Retrieved Snippets (highest relevance)\n');
    for (const r of topFiles) {
      const snippet = readSnippet(r.file, r.start_line, r.end_line);
      lines.push(`### ${r.file}  (lines ${r.start_line}–${r.end_line}, score ${r.score.toFixed(3)})\n\`\`\`\n${snippet}\n\`\`\`\n`);
    }
  }

  return lines.join('\n').slice(0, budget.maxChars);
}

// ── Triage — zero LLM calls ───────────────────────────────────────────────────

function runTriage(diffCtx) {
  const hotspots    = preHotspots(5);
  const hotspotSet  = new Set(hotspots.map(h => h.file));
  const authChanged = (diffCtx.files || []).filter(f =>
    /auth|config|secret|credential|key|password/i.test(f)
  );
  return {
    sentinel: { priority: authChanged.length > 0 ? 'CRITICAL' : 'STANDARD', authFiles: authChanged },
    reviewer: { priority: (diffCtx.files || []).some(f => hotspotSet.has(f)) ? 'HIGH' : 'STANDARD', hotspots },
    scribe:   { priority: 'STANDARD' },
  };
}

// ── Agent: sentinel ───────────────────────────────────────────────────────────

async function runSentinel(diffCtx) {
  const queries = [
    'hardcoded credentials api key password secret token private key',
    'sql injection string concatenation user input query database eval exec',
    'Math.random token session crypto weak md5 sha1 debug cors wildcard',
  ];
  const results = queries.flatMap(q => preSearch(q, 3).filter(r => r.score > 0.15));
  const ctx     = buildAgentContext('sentinel', diffCtx, results);

  const system = `You are sentinel — gitrails' security scanner. SOD role: analyzer (read-only).
Detect OWASP Top 10 vulnerabilities and hardcoded secrets.
Never invent findings. Only flag real issues visible in the diff and snippets provided.`;

  const prompt = `Analyze this diff and code for security issues.

${ctx}

Output security findings in this EXACT format:

---FINDINGS---
SEC-001 | CRITICAL | A07 | path/file.js:14 | Hardcoded AWS key | Move to env var
SEC-002 | HIGH     | A03 | path/file.js:8  | SQL injection via concat | Use parameterized queries
(one finding per line, pipe-delimited — only real findings)
---END---

If no findings: write "---FINDINGS---\\n(none)\\n---END---"

Then a 2-sentence summary. Do NOT invent findings.`;

  const raw = await callWithRetry(AGENT_MODELS.sentinel, [
    { role: 'system', content: system },
    { role: 'user',   content: prompt },
  ], 2048);

  // Parse findings
  const findingsM = raw.match(/---FINDINGS---\n([\s\S]*?)---END---/);
  let findings = [];
  if (findingsM) {
    findings = findingsM[1].trim().split('\n')
      .filter(l => l.trim() && l.includes('|') && !l.includes('(none)'))
      .map(l => {
        const [id, severity, owasp, location, description, fix] = l.split('|').map(p => p.trim());
        return { id, severity, owasp, location, description, fix };
      });
  }

  // Apply suppressions
  const suppressions = loadSuppressions();
  const suppressed   = [];
  const filtered     = findings.filter(f => {
    const filePart = (f.location || '').split(':')[0].trim();
    if (suppressions.some(p => matchesPattern(filePart, p))) {
      suppressed.push(f); return false;
    }
    return true;
  });
  if (suppressed.length) info(`Suppressed ${suppressed.length} finding(s) via false-positives rules`);

  const stats = {
    total:    filtered.length,
    critical: filtered.filter(f => /CRITICAL/i.test(f.severity)).length,
    high:     filtered.filter(f => /^HIGH$/i.test(f.severity)).length,
    medium:   filtered.filter(f => /MEDIUM/i.test(f.severity)).length,
    low:      filtered.filter(f => /^LOW$/i.test(f.severity)).length,
  };

  ok(`sentinel: ${stats.total} finding(s)  critical=${stats.critical}  high=${stats.high}`);
  return { raw, findings: filtered, stats };
}

// ── Agent: scribe ─────────────────────────────────────────────────────────────

async function runScribe(diffCtx) {
  const results = preSearch('public function missing documentation no jsdoc exported undocumented', 4)
    .filter(r => r.score > 0.15);
  const ctx = buildAgentContext('scribe', diffCtx, results);

  const system = `You are scribe — gitrails' documentation generator. SOD role: writer.
Find undocumented public functions in the changed files and generate accurate JSDoc stubs.
NEVER invent behavior not seen in the code.`;

  const prompt = `Analyze the diff below for undocumented public/exported functions.

${ctx}

For each undocumented function, output:

---DOCS---
FILE: path/to/file.js
FUNCTION: functionName
JSDOC:
/**
 * Brief description from the code.
 * @param {type} name - description
 * @returns {type} description
 */
---
---END---

If all functions are documented: "---DOCS---\\n(all documented)\\n---END---"
Do NOT invent behavior. Only document what is in the code.`;

  const raw  = await callWithRetry(AGENT_MODELS.scribe, [
    { role: 'system', content: system },
    { role: 'user',   content: prompt },
  ], 2048);

  const docsM   = raw.match(/---DOCS---\n([\s\S]*?)---END---/);
  const docCount = docsM ? (docsM[1].match(/^FUNCTION:/gm) || []).length : 0;

  ok(`scribe: ${docCount} function(s) documented`);
  return { raw, docCount };
}

// ── Agent: reviewer ───────────────────────────────────────────────────────────

async function runReviewer(diffCtx, sentinel) {
  const results = preSearch('null dereference missing error handling unhandled promise rejection', 3)
    .filter(r => r.score > 0.15);
  const hotspots = preHotspots(3);
  const ctx      = buildAgentContext('reviewer', diffCtx, results);

  // Sentinel summary passed as structured input
  const sentinelSummary = sentinel.stats.total > 0
    ? `Sentinel findings: ${sentinel.stats.total} total (${sentinel.stats.critical} CRITICAL, ${sentinel.stats.high} HIGH)\nTop findings:\n${sentinel.findings.slice(0, 5).map(f => `  - ${f.severity} ${f.location}: ${f.description}`).join('\n')}`
    : 'Sentinel: no security findings';

  const hotspotSummary = hotspots.length
    ? `Hotspots: ${hotspots.slice(0, 3).map(h => `${h.file} (complexity ${h.complexity})`).join(', ')}`
    : 'No hotspots above threshold';

  const system = `You are reviewer — gitrails' code quality analyst. SOD role: analyzer (read-only).
Score risk using: risk = 0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs
Thresholds: <0.3 APPROVED · 0.3–0.7 NEEDS_REVIEW · >0.7 BLOCKED`;

  const prompt = `Review this diff for quality and risk.

${ctx}

Context from sentinel:
${sentinelSummary}

${hotspotSummary}

Output in this EXACT format:

---RISK---
security_severity:  0.XX  (reason)
bug_probability:    0.XX  (reason)
complexity_delta:   0.XX  (reason)
test_coverage_gap:  0.XX  (reason)
documentation_debt: 0.XX  (reason)
RISK_SCORE:         0.XX
VERDICT:            BLOCKED | NEEDS_REVIEW | APPROVED
---END---

Then list the top 3 quality issues. Do NOT call tools.`;

  const raw = await callWithRetry(AGENT_MODELS.reviewer, [
    { role: 'system', content: system },
    { role: 'user',   content: prompt },
  ], 1536);

  // Parse risk score + verdict
  const riskM    = raw.match(/---RISK---\n([\s\S]*?)---END---/);
  let riskScore  = 0;
  let verdict    = 'APPROVED';

  if (riskM) {
    const scoreM   = riskM[1].match(/RISK_SCORE:\s*([\d.]+)/);
    const verdictM = riskM[1].match(/VERDICT:\s*(BLOCKED|NEEDS_REVIEW|APPROVED)/);
    riskScore      = scoreM  ? parseFloat(scoreM[1]) : 0;
    verdict        = verdictM ? verdictM[1].trim() : 'APPROVED';
  }

  // CRITICAL sentinel findings force BLOCKED regardless of score
  if (sentinel.stats.critical > 0) {
    riskScore = Math.max(riskScore, 0.85);
  }

  // Threshold is ground truth — LLM can only escalate, never downgrade
  const thresholdVerdict = riskScore > CONFIG.requireReview ? 'BLOCKED'
                         : riskScore > CONFIG.autoApprove   ? 'NEEDS_REVIEW'
                         :                                    'APPROVED';
  const order = { APPROVED: 0, NEEDS_REVIEW: 1, BLOCKED: 2 };
  if (!verdict || order[verdict] < order[thresholdVerdict]) verdict = thresholdVerdict;

  ok(`reviewer: risk=${riskScore.toFixed(2)}  verdict=${verdict}`);
  return { raw, riskScore, verdict };
}

// ── Agent: mirror ─────────────────────────────────────────────────────────────

async function runMirror(sentinel, reviewer, scribe) {
  // Mirror receives compact structured summary — NOT raw diff (SOD: auditor)
  const summary = [
    `Sentinel: ${sentinel.stats.total} finding(s) — critical=${sentinel.stats.critical} high=${sentinel.stats.high}`,
    sentinel.findings.slice(0, 5).map(f => `  ${f.severity} | ${f.location} | ${f.description}`).join('\n'),
    `Reviewer: risk=${reviewer.riskScore.toFixed(2)} verdict=${reviewer.verdict}`,
    `Scribe: ${scribe.docCount} function(s) documented`,
  ].join('\n');

  const system = `You are mirror — gitrails' conscience. SOD role: auditor (read-only, propose only).
Review gitrails' own scan results for false positives and learning opportunities.
NEVER modify knowledge/ directly. Propose changes only.`;

  const prompt = `Review these scan results for quality and learning opportunities.

${summary}

Respond in this EXACT format:

---LEARNING---
FALSE_POSITIVE: <describe any suspected false positive, or "none detected">
SUPPRESS_RULE: <glob pattern to suppress, or "none">
PROPOSE_PR: <proposed addition to knowledge/false-positives.md, or "none">
OBSERVATION: <one key observation about scan quality>
CONFIDENCE: HIGH | MEDIUM | LOW
---END---`;

  const raw      = await callWithRetry(AGENT_MODELS.mirror, [
    { role: 'system', content: system },
    { role: 'user',   content: prompt },
  ], 512);

  const learnM = raw.match(/---LEARNING---\n([\s\S]*?)---END---/);
  const fpCount = learnM ? (learnM[1].match(/^FALSE_POSITIVE:/gm) || []).length : 0;

  ok(`mirror: ${fpCount} false positive proposal(s)`);
  return { raw, fpCount };
}

// ── GitHub: post PR comment ───────────────────────────────────────────────────

async function postPRComment(prNum, sentinel, reviewer, scribe) {
  if (!prNum || !REPO || !GITHUB_TOKEN) return;

  const badge = reviewer.verdict === 'BLOCKED'
    ? '🔴 **BLOCKED**'
    : reviewer.verdict === 'NEEDS_REVIEW'
    ? '🟡 **NEEDS REVIEW**'
    : '🟢 **APPROVED**';

  const scoreBar = '█'.repeat(Math.round(reviewer.riskScore * 20)) + '░'.repeat(20 - Math.round(reviewer.riskScore * 20));
  const findingsTable = sentinel.findings.length > 0
    ? `| ID | Severity | File | Description |\n|---|---|---|---|\n` +
      sentinel.findings.slice(0, 10).map(f =>
        `| ${f.id} | ${f.severity} | \`${f.location}\` | ${f.description} |`
      ).join('\n')
    : '_No security findings._';

  const body = `## gitrails Security & Quality Review

${badge}  Risk score: \`${reviewer.riskScore.toFixed(2)}\`  \`${scoreBar}\`

---

### Security Findings (sentinel)

${findingsTable}

### Scribe

${scribe.docCount} function(s) documented in this diff.

---

<details>
<summary>Reviewer analysis</summary>

${reviewer.raw.slice(0, 2000)}

</details>

---
_gitrails · session \`${SESSION}\` · [gitagent spec v0.1.0](https://github.com/open-gitagent/gitagent)_`;

  await ghFetch(`/repos/${REPO}/issues/${prNum}/comments`, 'POST', { body });
  ok(`PR comment posted on #${prNum}`);
}

// ── GitHub: create check run ──────────────────────────────────────────────────

async function createGitHubCheck(sentinel, reviewer) {
  const sha = process.env.GITHUB_SHA;
  if (!sha || !REPO || !GITHUB_TOKEN) return;

  const conclusion = reviewer.verdict === 'BLOCKED'      ? 'failure'
                   : reviewer.verdict === 'NEEDS_REVIEW' ? 'neutral'
                   :                                        'success';

  const summary = `Risk: ${reviewer.riskScore.toFixed(2)} · Verdict: ${reviewer.verdict}\n` +
    `Findings: ${sentinel.stats.total} total (${sentinel.stats.critical} critical, ${sentinel.stats.high} high)`;

  await ghFetch(`/repos/${REPO}/check-runs`, 'POST', {
    name:         'gitrails / security & quality',
    head_sha:     sha,
    status:       'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title:   `gitrails: ${reviewer.verdict} (risk ${reviewer.riskScore.toFixed(2)})`,
      summary,
    },
  });
  ok(`GitHub Check created: ${conclusion}`);
}

// ── GitHub: apply PR label ────────────────────────────────────────────────────

async function applyPRLabel(prNum, verdict) {
  // NOTE: Labels must be created once in the repo: gitrails/approved, gitrails/needs-review, gitrails/blocked
  if (!prNum || !REPO || !GITHUB_TOKEN) return;

  const label = verdict === 'BLOCKED'      ? CONFIG.labelBlocked
              : verdict === 'NEEDS_REVIEW' ? CONFIG.labelNeedsReview
              :                              CONFIG.labelApproved;

  // Remove any existing gitrails/* labels
  const existing = await ghFetch(`/repos/${REPO}/issues/${prNum}/labels`);
  if (existing) {
    for (const l of existing) {
      if (l.name.startsWith('gitrails/')) {
        await ghFetch(`/repos/${REPO}/issues/${prNum}/labels/${encodeURIComponent(l.name)}`, 'DELETE');
      }
    }
  }

  const result = await ghFetch(`/repos/${REPO}/issues/${prNum}/labels`, 'POST', { labels: [label] });
  if (result) ok(`Label applied: ${label}`);
  else warn(`Label "${label}" not found — create it in repo Settings → Labels`);
}

// ── Session logging ───────────────────────────────────────────────────────────

function writeSessionLog(sentinel, reviewer, scribe, mirror) {
  try {
    const date    = new Date().toISOString().slice(0, 10);
    const logPath = join(ROOT, 'memory', 'runtime', 'dailylog.md');
    const memPath = join(ROOT, 'memory', 'MEMORY.md');

    const findingsTable = sentinel.findings.slice(0, 10).map(f =>
      `| ${f.id || '—'} | ${f.severity || '—'} | ${f.location || '—'} | ${(f.description || '—').slice(0, 60)} |`
    ).join('\n') || '| — | — | — | no findings |';

    const learnM = mirror.raw.match(/---LEARNING---\n([\s\S]*?)---END---/);
    const learning = learnM ? learnM[1].trim() : '(no learning block)';

    const logEntry = `
## Session ${SESSION}

- **Date**: ${date}
- **PR**: ${PR_NUM || 'local'}
- **Verdict**: ${reviewer.verdict}
- **Risk score**: ${reviewer.riskScore.toFixed(2)}
- **Findings**: ${sentinel.stats.total} (${sentinel.stats.critical} critical, ${sentinel.stats.high} high)
- **Docs**: ${scribe.docCount} function(s) documented

### Findings

| ID | Severity | Location | Description |
|---|---|---|---|
${findingsTable}

### Mirror Learning

\`\`\`
${learning}
\`\`\`

---
`;
    appendFileSync(logPath, logEntry, 'utf-8');

    // Prepend one bullet to MEMORY.md Recent Sessions, keep under 200 lines
    const bullet  = `- ${date} PR #${PR_NUM || 'local'}: ${reviewer.verdict} ${reviewer.riskScore.toFixed(2)} — ${sentinel.stats.total} finding(s), ${scribe.docCount} doc(s)\n`;
    let memText   = '';
    try { memText = readFileSync(memPath, 'utf-8'); } catch { memText = '# MEMORY\n\n## Recent Sessions\n\n'; }
    const insertAt = memText.indexOf('## Recent Sessions');
    const pos      = insertAt !== -1 ? insertAt + '## Recent Sessions\n'.length : memText.length;
    const updated  = memText.slice(0, pos) + '\n' + bullet + memText.slice(pos);
    writeFileSync(memPath, updated.split('\n').slice(0, 200).join('\n'), 'utf-8');

    ok('Session logged to memory/runtime/dailylog.md');
  } catch (e) {
    warn(`Session log failed: ${e.message.slice(0, 80)}`);
  }
}

// ── Summary renderer ──────────────────────────────────────────────────────────

function renderSummary(sentinel, reviewer, scribe, mirror) {
  console.log(`\n${C.bold}${hline('═')}${C.reset}`);
  console.log(`${C.bold}  gitrails · scan complete  session=${SESSION}${C.reset}`);
  console.log(`${C.bold}${hline('═')}${C.reset}\n`);

  const verdictColor = reviewer.verdict === 'BLOCKED'      ? C.red
                     : reviewer.verdict === 'NEEDS_REVIEW' ? C.yellow
                     :                                        C.green;
  const verdictIcon  = reviewer.verdict === 'BLOCKED'      ? '⛔'
                     : reviewer.verdict === 'NEEDS_REVIEW' ? '⚠'
                     :                                        '✓';

  console.log(`  ${C.bold}Verdict${C.reset}      ${verdictColor}${C.bold}${verdictIcon}  ${reviewer.verdict}${C.reset}`);
  console.log(`  ${C.bold}Risk Score${C.reset}   ${scoreBar(reviewer.riskScore)}`);
  console.log();
  console.log(`  ${C.bold}Security${C.reset}     ${sentinel.stats.total} finding(s)  ${C.red}${sentinel.stats.critical} CRITICAL${C.reset}  ${C.yellow}${sentinel.stats.high} HIGH${C.reset}  ${C.cyan}${sentinel.stats.medium} MEDIUM${C.reset}`);
  console.log(`  ${C.bold}Docs${C.reset}         ${scribe.docCount} function(s) documented`);
  console.log(`  ${C.bold}Mirror${C.reset}       ${mirror.fpCount} false positive proposal(s)`);
  console.log();

  if (sentinel.findings.length) {
    console.log(`  ${C.bold}${hline('─')}${C.reset}`);
    console.log(`  ${C.bold}Findings${C.reset}`);
    for (const f of sentinel.findings.slice(0, 8)) {
      const sColor = /CRITICAL/i.test(f.severity) ? C.red
                   : /HIGH/i.test(f.severity)     ? C.yellow
                   :                                 C.cyan;
      console.log(`  ${sColor}${(f.severity || '').padEnd(8)}${C.reset}  ${C.bold}${f.id || ''}${C.reset}  ${f.location || ''}  ${f.description || ''}`);
    }
    console.log();
  }

  console.log(`${C.bold}${hline('═')}${C.reset}\n`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const ts = new Date().toLocaleString('en-US', { hour12: false });
  console.log(`\n${C.bold}${C.cyan}gitrails production scanner${C.reset}  ${C.gray}${ts}${C.reset}`);
  console.log(`${C.gray}session=${SESSION}  heavy=${MODELS.heavy}  light=${MODELS.light}${C.reset}`);
  console.log(C.gray + hline() + C.reset);

  // Phase 1 — diff extraction + retrieval bootstrap
  phase(1, 'Diff extraction & retrieval');
  const diffCtx = await getDiff();
  info(`Mode: ${diffCtx.mode}  Files: ${(diffCtx.files || []).length}`);

  // Cache check — skip all LLM calls if same diff was scanned <24h ago
  const cacheKey = getCacheKey(diffCtx);
  const cached   = loadCache(cacheKey);
  if (cached) {
    ok('Cache hit — skipping API calls');
    renderSummary(cached.sentinel, cached.reviewer, cached.scribe, cached.mirror);
    process.exit(cached.reviewer.verdict === 'BLOCKED' ? 1 : 0);
  }

  // Phase 2 — triage (zero LLM calls)
  phase(2, 'Triage');
  const triage = runTriage(diffCtx);
  info(`sentinel priority=${triage.sentinel.priority}  reviewer priority=${triage.reviewer.priority}`);
  if (triage.sentinel.authFiles.length) warn(`Auth-sensitive files: ${triage.sentinel.authFiles.join(', ')}`);

  // Phase 3 — agent chain
  phase(3, `Agent chain  [heavy: ${MODELS.heavy}  light: ${MODELS.light}]`);

  // sentinel + scribe are independent — run in parallel
  info('Running sentinel + scribe in parallel...');
  const [sentinel, scribe] = await Promise.all([
    runSentinel(diffCtx),
    runScribe(diffCtx),
  ]);

  // reviewer needs sentinel findings
  const reviewer = await runReviewer(diffCtx, sentinel);

  // mirror audits all three
  const mirror = await runMirror(sentinel, reviewer, scribe);

  // Save to cache for subsequent identical diffs
  saveCache(cacheKey, { sentinel, reviewer, scribe, mirror });

  // Phase 4 — synthesize (GitHub integrations)
  phase(4, 'Synthesize');
  await Promise.all([
    postPRComment(PR_NUM, sentinel, reviewer, scribe),
    createGitHubCheck(sentinel, reviewer),
  ]);
  await applyPRLabel(PR_NUM, reviewer.verdict);

  // Phase 5 — session memory
  phase(5, 'Session memory');
  writeSessionLog(sentinel, reviewer, scribe, mirror);

  // Render terminal summary
  renderSummary(sentinel, reviewer, scribe, mirror);

  // Exit code — BLOCKED = 1 (fails CI)
  if (reviewer.verdict === 'BLOCKED') {
    fail(`Exiting 1 — verdict BLOCKED (risk ${reviewer.riskScore.toFixed(2)})`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(`\n${C.red}Fatal:${C.reset}`, err.message);
  process.exit(1);
});
