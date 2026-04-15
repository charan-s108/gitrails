#!/usr/bin/env node
/**
 * gitrails demo scan — polished multi-agent demo runner
 *
 * Architecture: pre-run ALL retrieval queries in Node.js (0 API calls),
 * then pass results to the LLM so it only needs to read specific lines.
 * Total API calls: 2–3 per agent (down from 8–10).
 *
 * Usage:
 *   node scripts/demo-scan.js [--agent sentinel|reviewer|scribe|mirror|all]
 *
 * npm shortcuts:
 *   npm run demo:sentinel   npm run demo:reviewer
 *   npm run demo:scribe     npm run demo:mirror
 *   npm run demo:all
 */

import { execSync } from 'child_process';

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  gray:    '\x1b[90m',
  bgRed:   '\x1b[41m',
  bgYellow:'\x1b[43m',
  bgGreen: '\x1b[42m',
  bgBlue:  '\x1b[44m',
  white:   '\x1b[97m',
};

const W = process.stdout.columns || 72;
const line  = (ch = '─') => ch.repeat(W);
function box(title, color = C.cyan) {
  const inner = W - 4;
  const titleLine = ` ${title} `;
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


function severityBadge(sev) {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL') return `${C.bgRed}${C.white}${C.bold} CRITICAL ${C.reset}`;
  if (s === 'HIGH')     return `${C.bgYellow}${C.bold}   HIGH   ${C.reset}`;
  if (s === 'MEDIUM')   return `${C.bgBlue}${C.white}  MEDIUM  ${C.reset}`;
  return                       `${C.bgGreen}${C.white}   LOW    ${C.reset}`;
}

function scoreBar(score) {
  const pct = Math.min(1, Math.max(0, parseFloat(score) || 0));
  const filled = Math.round(pct * 20);
  const empty  = 20 - filled;
  const color  = pct > 0.7 ? C.red : pct > 0.3 ? C.yellow : C.green;
  return `${color}${'█'.repeat(filled)}${C.gray}${'░'.repeat(empty)}${C.reset}  ${C.bold}${(pct).toFixed(2)}${C.reset}`;
}

// ── Config ────────────────────────────────────────────────────────────────────

const MODEL_ENV = process.env.GITRAILS_MODEL;
const API_KEY   = process.env.GROQ_API_KEY;

if (!MODEL_ENV || !API_KEY) {
  console.error(`${C.red}✗  Missing env vars.${C.reset}`);
  if (!MODEL_ENV) console.error('   GITRAILS_MODEL not set — add to .env');
  if (!API_KEY)   console.error('   GROQ_API_KEY not set  — get free key at https://console.groq.com');
  process.exit(1);
}

const MODEL    = MODEL_ENV.includes(':') ? MODEL_ENV.split(':').slice(1).join(':') : MODEL_ENV;
const BASE_URL = 'https://api.groq.com/openai/v1';

// ── CLI args ──────────────────────────────────────────────────────────────────

const ARGV   = process.argv.slice(2);
const agentArg = ARGV[ARGV.indexOf('--agent') + 1] || ARGV.find(a => !a.startsWith('-')) || 'sentinel';
const TARGET = process.env.GITRAILS_TARGET || 'demo-target/';

// ── Agent definitions ─────────────────────────────────────────────────────────

const AGENTS = {
  sentinel: {
    icon: '🔴',
    label: 'sentinel',
    role:  'Security Scanner',
    color: C.red,
    temperature: 0.1,
    queries: [
      'hardcoded credentials api key password secret token private key',
      'sql injection string concatenation user input query database',
      'eval exec innerHTML shell command injection dangerous function',
      'Math.random token session crypto weak algorithm md5 sha1',
      'debug true cors wildcard CORS allow origin star misconfiguration',
    ],
    hotspotThreshold: 5,
    system: `You are sentinel — gitrails' security scanner. SOD role: analyzer (read-only).
You detect OWASP Top 10 vulnerabilities and hardcoded secrets.
Use cli(command) to read files. Never simulate output. Never invent findings.`,
    reportPrompt: (ctx) => `The code has already been retrieved. Analyze it now — no tool calls needed.

${ctx}

Inspect the code above and produce a security report in this EXACT format:

---FINDINGS---
SEC-001 | CRITICAL | A07 | src/auth/config.js:14 | Hardcoded AWS access key AKIA[REDACTED] | Move to environment variable
SEC-002 | HIGH     | A03 | src/db/queries.js:8   | SQL injection via string concat | Use parameterized queries
(one finding per line, pipe-delimited — only real findings from the code above)
---END---

Then write a 2–3 sentence summary.
Do NOT invent findings. Do NOT call any tools. Analyze only what is shown above.`,
  },

  reviewer: {
    icon: '🟡',
    label: 'reviewer',
    role:  'Code Quality & Risk Score',
    color: C.yellow,
    temperature: 0.2,
    queries: [
      'null dereference undefined property access missing null check',
      'missing error handling bare catch promise rejection unhandled',
      'missing input validation user input sanitization',
    ],
    hotspotThreshold: 3,
    system: `You are reviewer — gitrails' code quality analyst. SOD role: analyzer (read-only).
You produce a weighted risk score and identify bugs, complexity hotspots, missing tests.
Risk formula: 0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs
Use cli(command) to read files. Never simulate output.`,
    reportPrompt: (ctx) => `The code has already been retrieved. Analyze it now — no tool calls needed.

${ctx}

Evaluate the risk using this formula: 0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs

Output in this EXACT format:

---RISK---
security_severity:  0.XX  (reason)
bug_probability:    0.XX  (reason)
complexity_delta:   0.XX  (reason based on hotspots above)
test_coverage_gap:  0.XX  (reason)
documentation_debt: 0.XX  (reason)
RISK_SCORE:         0.XX
VERDICT:            BLOCKED | NEEDS_REVIEW | APPROVED
---END---

Then list the top 3 code quality issues.
Do NOT call any tools. Analyze only the code shown above.`,
  },

  scribe: {
    icon: '🟢',
    label: 'scribe',
    role:  'Documentation Generator',
    color: C.green,
    temperature: 0.4,
    queries: [
      'public function missing documentation no jsdoc no comment',
      'exported function async function class method undocumented',
    ],
    hotspotThreshold: 3,
    system: `You are scribe — gitrails' documentation generator. SOD role: writer.
You find undocumented public functions and generate accurate JSDoc stubs.
NEVER invent behavior not seen in the code. Only document what exists.
Use cli(command) to read files.`,
    reportPrompt: (ctx) => `The code has already been retrieved. Analyze it now — no tool calls needed.

${ctx}

Identify public/exported functions that lack JSDoc comments. For each, output:

---DOCS---
FILE: src/auth/login.js
FUNCTION: validateUser
JSDOC:
/**
 * Validates user credentials against the database.
 * @param {string} userId - The user identifier
 * @param {string} password - The plaintext password to validate
 * @returns {Promise<Object|null>} The user object, or null if invalid
 */
---
(repeat for each undocumented function found)
---END---

Only document functions actually visible in the code above.
Do NOT call any tools. Do NOT invent behavior not in the code.`,
  },

  mirror: {
    icon: '🪞',
    label: 'mirror',
    role:  'Self-Auditor & Learning',
    color: C.magenta,
    temperature: 0.2,
    queries: [
      'test fixture mock fake token placeholder example credential',
      'false positive example dummy test data not real secret',
    ],
    hotspotThreshold: 10,
    system: `You are mirror — gitrails' conscience. SOD role: auditor (read-only, propose only).
You review gitrails' own scan results for false positives and learning opportunities.
You NEVER modify knowledge/ directly. You only propose changes via PR description.`,
    reportPrompt: (ctx) => `The code has already been retrieved. Analyze it now — no tool calls needed.

${ctx}

Review the code above for false positives and learning opportunities.
Propose suppressions and observations in this format:

---LEARNING---
FALSE_POSITIVE: demo-target/README.md flagged for credential keywords — this is documentation, not code
SUPPRESS_RULE: Ignore *.md files in demo-target/ for credential scanning
PROPOSE_PR: Add to knowledge/false-positives.md: "## demo-target docs\\n- pattern: demo-target/**/*.md"

OBSERVATION: sentinel correctly flagged all seeded vulnerabilities with no misses
CONFIDENCE: HIGH — findings match known vulnerability table in demo-target/README.md
---END---

Do NOT call any tools. Analyze only what is shown above.`,
  },
};

// ── Tool infrastructure ───────────────────────────────────────────────────────

const TOOLS = [{
  type: 'function',
  function: {
    name: 'cli',
    description: 'Execute a shell command and return stdout.',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
}];

function runCli(command) {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    }) || '(no output)';
  } catch (err) {
    return `ERROR: ${err.message}\n${err.stdout || ''}${err.stderr || ''}`.slice(0, 800);
  }
}

async function chat(messages, allowTools = false, temperature = 0.1) {
  const body = {
    model: MODEL, messages,
    max_tokens: 2048, temperature,
  };
  if (allowTools) { body.tools = TOOLS; body.tool_choice = 'auto'; }
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

// ── Phase 1: Pre-run retrieval locally (0 API calls) ─────────────────────────

function preSearch(query, topK = 3) {
  const raw = runCli(`node retrieval/index.js --query "${query.replace(/"/g, '\\"')}" --top-k ${topK}`);
  try { return JSON.parse(raw); } catch { return []; }
}

function preHotspots(threshold) {
  const raw = runCli(`node retrieval/graph.js --hotspots --threshold ${threshold}`);
  try { return JSON.parse(raw); } catch { return []; }
}

function preReadSnippet(file, startLine, endLine) {
  // Clamp to at most 40 lines to keep context tight
  const start = parseInt(startLine) || 1;
  const end   = Math.min(parseInt(endLine) || start + 39, start + 39);
  return runCli(`sed -n "${start},${end}p" ${file}`);
}

function buildContext(searchResults, hotspots) {
  const lines = [];
  // Collect unique (file, start, end) tuples ranked by score
  const seen   = new Map();   // file -> best result
  for (const results of Object.values(searchResults)) {
    for (const r of results) {
      if (!seen.has(r.file) || seen.get(r.file).score < r.score) {
        seen.set(r.file, r);
      }
    }
  }

  // Sort by score descending, take top 4 files to stay under token budget
  const topFiles = [...seen.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  lines.push('## Code Snippets (pre-read, highest-relevance files)\n');
  for (const r of topFiles) {
    const snippet = preReadSnippet(r.file, r.start_line, r.end_line);
    lines.push(`### ${r.file}  (lines ${r.start_line}–${r.end_line}, score ${r.score.toFixed(3)})\n`);
    lines.push('```');
    lines.push(snippet.slice(0, 1200));   // hard cap per file
    lines.push('```\n');
  }

  if (hotspots.length) {
    lines.push('## Code Graph Hotspots\n');
    for (const h of hotspots) {
      lines.push(`  - ${h.file}  complexity: ${h.complexity}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ── Phase 2: LLM agent loop ───────────────────────────────────────────────────

async function runAgentLoop(agent, context) {
  // All code is pre-read into context — single LLM call, no tool loop.
  // This keeps total tokens well under Groq's 6000 TPM limit.
  const messages = [
    { role: 'system', content: agent.system },
    { role: 'user',   content: agent.reportPrompt(context) },
  ];

  let response;
  let apiCalls = 0;

  const attempt = async () => {
    response = await chat(messages, false, agent.temperature ?? 0.1);
    apiCalls++;
  };

  try {
    await attempt();
  } catch (err) {
    if (err.message.includes('429') || err.message.includes('quota') ||
        err.message.includes('6000') || err.message.includes('12000')) {
      warn('Rate limit hit — waiting 62s then retrying...');
      await new Promise(r => setTimeout(r, 62_000));
      await attempt();
    } else {
      throw err;
    }
  }

  const msg = response.choices[0].message;
  const raw = msg.content || '';

  // Render with colour highlights
  const formatted = raw
    .replace(/\bCRITICAL\b/g, `${C.red}${C.bold}CRITICAL${C.reset}`)
    .replace(/\bHIGH\b/g,     `${C.yellow}${C.bold}HIGH${C.reset}`)
    .replace(/\bMEDIUM\b/g,   `${C.cyan}MEDIUM${C.reset}`)
    .replace(/\bLOW\b/g,      `${C.green}LOW${C.reset}`)
    .replace(/SEC-\d{3}/g,    m => `${C.bold}${m}${C.reset}`)
    .replace(/\bBLOCKED\b/g,      `${C.red}${C.bold}BLOCKED${C.reset}`)
    .replace(/\bNEEDS_REVIEW\b/g, `${C.yellow}NEEDS_REVIEW${C.reset}`)
    .replace(/\bAPPROVED\b/g,     `${C.green}APPROVED${C.reset}`)
    .replace(/^---(.+)---$/gm, (_, t) => `\n${C.bold}${C.blue}── ${t.trim()} ──${C.reset}`)
    .replace(/^#{1,3} (.+)/gm, (_, t) => `${C.bold}${t}${C.reset}`);

  process.stdout.write(formatted + '\n');
  return { fullText: raw, apiCalls };
}

// ── Report renderer ───────────────────────────────────────────────────────────

function renderFindingsTable(text) {
  const lines = text.split('\n');
  const inBlock = { start: false, findings: [] };

  for (const l of lines) {
    if (l.includes('---FINDINGS---') || l.includes('---RISK---') ||
        l.includes('---DOCS---')     || l.includes('---LEARNING---')) {
      inBlock.start = true; continue;
    }
    if (l.includes('---END---')) { inBlock.start = false; continue; }
    if (inBlock.start && l.trim()) inBlock.findings.push(l.trim());
  }

  if (!inBlock.findings.length) return;

  console.log(`\n${C.bold}${line('─')}${C.reset}`);
  console.log(`${C.bold}  STRUCTURED OUTPUT${C.reset}`);
  console.log(`${C.bold}${line('─')}${C.reset}\n`);

  for (const f of inBlock.findings) {
    const parts = f.split('|').map(p => p.trim());
    if (parts.length >= 3) {
      // Finding: ID | SEVERITY | OWASP | location | description | fix
      const [id, sev, owasp, loc, desc, fix] = parts;
      console.log(`  ${C.bold}${id || ''}${C.reset}  ${severityBadge(sev)}  ${C.cyan}${owasp || ''}${C.reset}`);
      if (loc)  console.log(`  ${C.gray}Location:${C.reset}  ${C.yellow}${loc}${C.reset}`);
      if (desc) console.log(`  ${C.gray}Finding:${C.reset}   ${desc}`);
      if (fix)  console.log(`  ${C.gray}Fix:${C.reset}       ${C.green}${fix}${C.reset}`);
      console.log();
    } else if (f.includes(':')) {
      // Key: value lines (risk scores, learning proposals)
      const [key, ...rest] = f.split(':');
      const val = rest.join(':').trim();
      if (key.includes('RISK_SCORE')) {
        console.log(`  ${C.bold}${key}:${C.reset}  ${scoreBar(val)}`);
      } else if (key.includes('VERDICT')) {
        const badge = val.includes('BLOCKED') ? `${C.red}${C.bold}⛔ BLOCKED${C.reset}`
                    : val.includes('NEEDS')   ? `${C.yellow}${C.bold}⚠ NEEDS REVIEW${C.reset}`
                    :                           `${C.green}${C.bold}✓ APPROVED${C.reset}`;
        console.log(`  ${C.bold}${key}:${C.reset}  ${badge}`);
      } else {
        console.log(`  ${C.gray}${key}:${C.reset}  ${val}`);
      }
    } else {
      console.log(`  ${f}`);
    }
  }
}

// ── Summary extraction + rendering ───────────────────────────────────────────

function parseSummary(agentName, fullText, apiCalls) {
  const summary = { agent: agentName, icon: AGENTS[agentName].icon, apiCalls, metrics: {} };

  // sentinel — count findings by severity
  const findingsM = fullText.match(/---FINDINGS---\n([\s\S]*?)---END---/);
  if (findingsM) {
    const rows = findingsM[1].trim().split('\n').filter(l => l.trim() && l.includes('|'));
    summary.metrics = {
      total:    rows.length,
      critical: rows.filter(l => /\|\s*CRITICAL\s*\|/.test(l)).length,
      high:     rows.filter(l => /\|\s*HIGH\s*\|/.test(l)).length,
      medium:   rows.filter(l => /\|\s*MEDIUM\s*\|/.test(l)).length,
      low:      rows.filter(l => /\|\s*LOW\s*\|/.test(l)).length,
    };
  }

  // reviewer — risk score + verdict
  const riskM = fullText.match(/---RISK---\n([\s\S]*?)---END---/);
  if (riskM) {
    const scoreM   = riskM[1].match(/RISK_SCORE:\s*([\d.]+)/);
    const verdictM = riskM[1].match(/VERDICT:\s*(\S+)/);
    summary.metrics = {
      riskScore: scoreM  ? parseFloat(scoreM[1])   : null,
      verdict:   verdictM ? verdictM[1].trim()      : null,
    };
  }

  // scribe — count documented functions
  const docsM = fullText.match(/---DOCS---\n([\s\S]*?)---END---/);
  if (docsM) {
    summary.metrics = {
      documented: (docsM[1].match(/^FUNCTION:/gm) || []).length,
    };
  }

  // mirror — false positives + observations
  const learnM = fullText.match(/---LEARNING---\n([\s\S]*?)---END---/);
  if (learnM) {
    summary.metrics = {
      falsePositives: (learnM[1].match(/^FALSE_POSITIVE:/gm) || []).length,
      suppressions:   (learnM[1].match(/^SUPPRESS_RULE:/gm)  || []).length,
      observations:   (learnM[1].match(/^OBSERVATION:/gm)    || []).length,
    };
  }

  return summary;
}

function renderAgentSummary(summary) {
  const agent = AGENTS[summary.agent];
  const m = summary.metrics;
  let keyLine = '';

  if (summary.agent === 'sentinel') {
    const parts = [];
    if (m.total === 0) {
      parts.push(`${C.green}no findings${C.reset}`);
    } else {
      parts.push(`${C.bold}${m.total} finding${m.total !== 1 ? 's' : ''}${C.reset}`);
      if (m.critical) parts.push(`${C.red}${C.bold}${m.critical} CRITICAL${C.reset}`);
      if (m.high)     parts.push(`${C.yellow}${m.high} HIGH${C.reset}`);
      if (m.medium)   parts.push(`${C.cyan}${m.medium} MEDIUM${C.reset}`);
      if (m.low)      parts.push(`${C.green}${m.low} LOW${C.reset}`);
    }
    keyLine = parts.join('  ·  ');
  } else if (summary.agent === 'reviewer') {
    const score = m.riskScore != null ? scoreBar(m.riskScore) : '—';
    const badge = m.verdict
      ? (m.verdict.includes('BLOCKED')  ? `${C.red}${C.bold}⛔ BLOCKED${C.reset}`
       : m.verdict.includes('NEEDS')    ? `${C.yellow}⚠ NEEDS REVIEW${C.reset}`
       :                                  `${C.green}✓ APPROVED${C.reset}`)
      : '—';
    keyLine = `Risk score: ${score}   ${badge}`;
  } else if (summary.agent === 'scribe') {
    keyLine = m.documented
      ? `${C.bold}${m.documented}${C.reset} function${m.documented !== 1 ? 's' : ''} documented`
      : `${C.gray}no undocumented functions found${C.reset}`;
  } else if (summary.agent === 'mirror') {
    const parts = [];
    if (m.falsePositives) parts.push(`${C.yellow}${m.falsePositives} false positive${m.falsePositives !== 1 ? 's' : ''}${C.reset}`);
    if (m.suppressions)   parts.push(`${m.suppressions} suppression${m.suppressions !== 1 ? 's' : ''} proposed`);
    if (m.observations)   parts.push(`${m.observations} observation${m.observations !== 1 ? 's' : ''}`);
    keyLine = parts.length ? parts.join('  ·  ') : `${C.gray}no learning proposals${C.reset}`;
  }

  console.log(`\n${agent.color}${line('─')}${C.reset}`);
  console.log(`  ${C.bold}${agent.icon}  ${agent.label}  summary${C.reset}   ${C.gray}API calls: ${summary.apiCalls}${C.reset}`);
  console.log(`  ${keyLine}`);
  console.log(`${agent.color}${line('─')}${C.reset}\n`);
}

function renderFinalSummary(summaries) {
  const totalCalls = summaries.reduce((n, s) => n + s.apiCalls, 0);

  console.log('\n' + box('gitrails · demo run complete', C.cyan));
  console.log();

  // Header row
  const col1 = 22, col2 = 12;
  const colH = `  ${C.bold}${'Agent'.padEnd(col1)}${'API Calls'.padEnd(col2)}Key Findings${C.reset}`;
  console.log(colH);
  console.log(`  ${C.gray}${line('─').slice(0, W - 4)}${C.reset}`);

  for (const s of summaries) {
    const agent = AGENTS[s.agent];
    const m = s.metrics;
    let finding = '';

    if (s.agent === 'sentinel') {
      if (m.total === 0) {
        finding = `${C.green}no findings${C.reset}`;
      } else {
        const parts = [`${C.bold}${m.total} finding${m.total !== 1 ? 's' : ''}${C.reset}`];
        if (m.critical) parts.push(`${C.red}${m.critical} CRITICAL${C.reset}`);
        if (m.high)     parts.push(`${C.yellow}${m.high} HIGH${C.reset}`);
        if (m.medium)   parts.push(`${C.cyan}${m.medium} MEDIUM${C.reset}`);
        if (m.low)      parts.push(`${C.green}${m.low} LOW${C.reset}`);
        finding = parts.join(', ');
      }
    } else if (s.agent === 'reviewer') {
      const score = m.riskScore != null ? m.riskScore.toFixed(2) : '—';
      const verdict = m.verdict
        ? (m.verdict.includes('BLOCKED') ? `${C.red}${C.bold}BLOCKED${C.reset}`
         : m.verdict.includes('NEEDS')   ? `${C.yellow}NEEDS REVIEW${C.reset}`
         :                                 `${C.green}APPROVED${C.reset}`)
        : '—';
      finding = `Risk: ${C.bold}${score}${C.reset}   ${verdict}`;
    } else if (s.agent === 'scribe') {
      finding = m.documented
        ? `${C.bold}${m.documented}${C.reset} function${m.documented !== 1 ? 's' : ''} documented`
        : `${C.gray}no undocumented functions${C.reset}`;
    } else if (s.agent === 'mirror') {
      const parts = [];
      if (m.falsePositives) parts.push(`${m.falsePositives} false positive${m.falsePositives !== 1 ? 's' : ''}`);
      if (m.suppressions)   parts.push(`${m.suppressions} suppression${m.suppressions !== 1 ? 's' : ''}`);
      if (m.observations)   parts.push(`${m.observations} observation${m.observations !== 1 ? 's' : ''}`);
      finding = parts.length ? parts.join('  ·  ') : `${C.gray}no proposals${C.reset}`;
    }

    const nameCol = `${agent.icon} ${agent.label}`.padEnd(col1);
    const callsCol = String(s.apiCalls).padEnd(col2);
    console.log(`  ${nameCol}${callsCol}${finding}`);
  }

  console.log(`  ${C.gray}${line('─').slice(0, W - 4)}${C.reset}`);
  const totalCol = 'Total'.padEnd(col1);
  const totalCallsCol = String(totalCalls).padEnd(col2);
  console.log(`  ${C.bold}${totalCol}${totalCallsCol}${totalCalls} API call${totalCalls !== 1 ? 's' : ''} across ${summaries.length} agents${C.reset}`);
  console.log();
}

// ── Run a single agent ────────────────────────────────────────────────────────

async function runAgent(agentName) {
  const agent = AGENTS[agentName];
  if (!agent) {
    console.error(`Unknown agent: ${agentName}. Choose: sentinel | reviewer | scribe | mirror | all`);
    process.exit(1);
  }

  // Header
  console.log('\n' + box(`${agent.icon}  gitrails · ${agent.label}  │  ${agent.role}`, agent.color));
  info(`Target: ${C.bold}${TARGET}${C.reset}   Model: ${C.bold}${MODEL_ENV}${C.reset}`);

  // ── Phase 1: local retrieval (0 API calls) ────────────────────────────────
  phase(1, 'Pre-search via vector index + code graph (0 API calls)');

  const searchResults = {};
  for (const q of agent.queries) {
    const results = preSearch(q, 3);
    searchResults[q] = results.filter(r => r.score > 0.15);
    const top = results[0];
    const summary = top
      ? `${C.bold}${top.file.split('/').slice(-1)[0]}${C.reset}:${top.start_line}  score: ${C.cyan}${top.score.toFixed(3)}${C.reset}`
      : `${C.gray}no results${C.reset}`;
    ok(`${results.filter(r=>r.score>0.15).length} result(s)  — top: ${summary}`);
  }

  const hotspots = preHotspots(agent.hotspotThreshold);
  if (hotspots.length) {
    ok(`${hotspots.length} complexity hotspot(s)  — highest: ${C.bold}${hotspots[0].file.split('/').slice(-1)[0]}${C.reset} (complexity ${hotspots[0].complexity})`);
  } else {
    info('No complexity hotspots above threshold');
  }

  const context = buildContext(searchResults, hotspots);
  const uniqueFiles = new Set(
    Object.values(searchResults).flat().map(r => r.file)
  );
  info(`${uniqueFiles.size} unique file(s) flagged — passing pre-computed context to LLM`);

  // ── Phase 2: LLM reads files + generates report ───────────────────────────
  phase(2, `LLM reading flagged lines → generating ${agent.role} report`);
  console.log();

  let result;
  try {
    result = await runAgentLoop(agent, context);
  } catch (err) {
    if (err.message.includes('429') || err.message.includes('6000')) {
      warn('TPM quota hit. Waiting 62s then retrying...');
      await new Promise(r => setTimeout(r, 62_000));
      result = await runAgentLoop(agent, context);
    } else {
      console.error(`${C.red}API error:${C.reset}`, err.message.slice(0, 200));
      process.exit(1);
    }
  }

  // ── Phase 3: structured render ────────────────────────────────────────────
  phase(3, 'Structured findings');
  renderFindingsTable(result.fullText);

  // Summary box
  const summary = parseSummary(agentName, result.fullText, result.apiCalls);
  renderAgentSummary(summary);

  return summary;
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  const ts = new Date().toLocaleString('en-US', { hour12: false });
  console.log(`\n${C.bold}${C.cyan}gitrails demo runner${C.reset}  ${C.gray}${ts}${C.reset}`);
  console.log(`${C.gray}Model: ${MODEL_ENV}  │  Target: ${TARGET}${C.reset}`);
  console.log(C.gray + line() + C.reset);

  if (agentArg === 'all') {
    const summaries = [];
    for (const name of ['sentinel', 'reviewer', 'scribe', 'mirror']) {
      const summary = await runAgent(name);
      if (summary) summaries.push(summary);
      if (name !== 'mirror') {
        console.log(`${C.gray}  ↳ waiting 5s before next agent...${C.reset}`);
        await new Promise(r => setTimeout(r, 5_000));
      }
    }
    renderFinalSummary(summaries);
  } else {
    await runAgent(agentArg);
  }
}

main().catch(err => {
  console.error(`\n${C.red}Fatal:${C.reset}`, err.message);
  process.exit(1);
});
