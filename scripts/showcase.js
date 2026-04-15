#!/usr/bin/env node
/**
 * gitrails showcase — runs all 3 verdict scenarios in sequence.
 *
 * Demonstrates:
 *   ⛔ BLOCKED     — OWASP Top 10 violations, CRITICAL findings
 *   ⚠  NEEDS_REVIEW — Medium-severity issues, no CRITICAL
 *   ✓  APPROVED    — Production-quality, clean code
 *
 * Usage:
 *   node scripts/showcase.js
 *   node scripts/showcase.js --scenario blocked
 *   node scripts/showcase.js --scenario needs-review
 *   node scripts/showcase.js --scenario clean
 */

import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const ARGV      = process.argv.slice(2);
const SINGLE    = ARGV.includes('--scenario') ? ARGV[ARGV.indexOf('--scenario') + 1] : null;

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m',
  cyan: '\x1b[36m', blue: '\x1b[34m', magenta: '\x1b[35m',
  gray: '\x1b[90m', white: '\x1b[97m',
  bgRed: '\x1b[41m', bgYellow: '\x1b[43m', bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
};

const W     = process.stdout.columns || 80;
const hline = (ch = '─') => ch.repeat(W);

const SCENARIOS = [
  {
    id:      'blocked',
    dir:     'scenarios/blocked',
    label:   'BLOCKED',
    icon:    '⛔',
    color:   C.red,
    bgColor: C.bgRed,
    desc:    'OWASP Top 10 violations — SQL injection, hardcoded AWS key, eval(), MD5 passwords',
    expect:  'Risk > 0.80 · 3+ CRITICAL findings · Exit code 1',
  },
  {
    id:      'needs-review',
    dir:     'scenarios/needs-review',
    label:   'NEEDS_REVIEW',
    icon:    '⚠',
    color:   C.yellow,
    bgColor: C.bgYellow,
    desc:    'Medium-severity issues — missing validation, null dereference, unhandled rejections',
    expect:  'Risk 0.35–0.65 · 0 CRITICAL, 1–3 HIGH · Exit code 0',
  },
  {
    id:      'clean',
    dir:     'scenarios/clean',
    label:   'APPROVED',
    icon:    '✓',
    color:   C.green,
    bgColor: C.bgGreen,
    desc:    'Production-quality — parameterized queries, env secrets, validation, JSDoc',
    expect:  'Risk < 0.25 · No CRITICAL/HIGH findings · Exit code 0',
  },
];

function shell(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe', ...opts });
}

function scenarioBanner(s, n, total) {
  console.log('\n' + C.bold + hline('═') + C.reset);
  console.log(`${s.bgColor}${C.white}${C.bold}  ${s.icon}  Scenario ${n}/${total}: ${s.label.padEnd(14)}${C.reset}`);
  console.log(`${C.bold}${C.dim}  ${s.desc}${C.reset}`);
  console.log(`${C.gray}  Expected: ${s.expect}${C.reset}`);
  console.log(C.bold + hline('═') + C.reset + '\n');
}

async function runScenario(s, n, total) {
  scenarioBanner(s, n, total);

  // Step 1: build vector index for this scenario's directory
  console.log(`${C.cyan}◆${C.reset}  Building vector index for ${C.bold}${s.dir}${C.reset}...`);
  try {
    shell(`node retrieval/index.js --build --rebuild --root ./${s.dir}`);
    shell(`node retrieval/graph.js --build --root ./${s.dir}`);
    console.log(`${C.green}✓${C.reset}  Index ready\n`);
  } catch (e) {
    console.log(`${C.yellow}⚠${C.reset}  Index build warning (continuing): ${e.message.slice(0, 100)}\n`);
  }

  // Step 2: run demo scanner
  const env = {
    ...process.env,
    GITRAILS_TARGET: s.dir + '/',
    GITRAILS_MODEL:  process.env.GITRAILS_MODEL || (process.env.GITRAILS_MODEL_HEAVY || 'groq:llama-3.3-70b-versatile').replace(/^groq:/, 'groq:'),
  };

  const result = spawnSync('node', ['scripts/demo-scan.js', '--agent', 'all'], {
    cwd: ROOT, env, stdio: 'inherit', timeout: 300_000,
  });

  // Step 3: outcome summary
  const exitLabel = result.status === 0
    ? `${C.bgGreen}${C.white}${C.bold}  PASS  ${C.reset}`
    : `${C.bgRed}${C.white}${C.bold}  FAIL (exit ${result.status})  ${C.reset}`;

  console.log(`\n${C.bold}${hline('─')}${C.reset}`);
  console.log(`  Scenario ${n}/${total}: ${s.icon} ${s.color}${C.bold}${s.label}${C.reset}   ${exitLabel}`);
  console.log(`${C.bold}${hline('─')}${C.reset}\n`);

  return result.status;
}

async function main() {
  const targets = SINGLE
    ? SCENARIOS.filter(s => s.id === SINGLE)
    : SCENARIOS;

  if (!targets.length) {
    console.error(`Unknown scenario "${SINGLE}". Choose: blocked | needs-review | clean`);
    process.exit(1);
  }

  const ts = new Date().toLocaleString('en-US', { hour12: false });
  console.log(`\n${C.bold}${C.cyan}gitrails showcase${C.reset}  ${C.gray}${ts}${C.reset}`);
  console.log(`${C.gray}Running ${targets.length} scenario(s): ${targets.map(s => s.label).join(' → ')}${C.reset}`);

  // Check env
  if (!process.env.GROQ_API_KEY) {
    console.error(`\n${C.red}✗  GROQ_API_KEY not set${C.reset}  — add to .env then run: npx dotenv -e .env -- node scripts/showcase.js`);
    process.exit(1);
  }

  const results = [];
  for (let i = 0; i < targets.length; i++) {
    const code = await runScenario(targets[i], i + 1, targets.length);
    results.push({ scenario: targets[i], exitCode: code });
    if (i < targets.length - 1) {
      console.log(`${C.gray}  ↳ waiting 8s before next scenario (rate limit)...${C.reset}`);
      await new Promise(r => setTimeout(r, 8_000));
    }
  }

  // Final scorecard
  console.log('\n' + C.bold + hline('═') + C.reset);
  console.log(`${C.bold}  gitrails showcase · scorecard${C.reset}`);
  console.log(C.bold + hline('─') + C.reset);

  for (const { scenario: s, exitCode } of results) {
    const passed   = (s.id === 'blocked' && exitCode !== 0) ||
                     (s.id !== 'blocked' && exitCode === 0);
    const badge    = passed ? `${C.green}${C.bold}CORRECT${C.reset}` : `${C.red}${C.bold}UNEXPECTED${C.reset}`;
    const exitInfo = exitCode !== 0 ? `${C.red}exit ${exitCode}${C.reset}` : `${C.green}exit 0${C.reset}`;
    console.log(`  ${s.icon} ${s.color}${s.label.padEnd(14)}${C.reset}  ${exitInfo}   ${badge}`);
  }

  console.log(C.bold + hline('═') + C.reset + '\n');
}

main().catch(err => {
  console.error(`\n${C.red}Fatal:${C.reset}`, err.message);
  process.exit(1);
});
