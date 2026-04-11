#!/usr/bin/env node
/**
 * gitrails CLI — production entry point
 *
 * Install globally:  npm install -g gitrails
 * Or run directly:   npx gitrails
 *
 * Commands:
 *   gitrails scan  [--pr N | --diff range | --full] [--target dir]
 *   gitrails demo  [--agent sentinel|reviewer|scribe|mirror|all]
 *   gitrails index [--root dir] [--rebuild]
 *   gitrails graph [--root dir]
 *   gitrails validate
 *   gitrails info
 */

import { execSync }         from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath }    from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red:   '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m',
  gray:  '\x1b[90m', yellow: '\x1b[33m',
};

const VERSION = '1.0.0';

const HELP = `
${C.bold}${C.cyan}gitrails${C.reset} v${VERSION} — self-aware engineering teammate

${C.bold}Usage:${C.reset}
  gitrails <command> [options]

${C.bold}Commands:${C.reset}
  ${C.cyan}scan${C.reset}      Run production scan (diff-first, structured handoffs, GitHub Check)
  ${C.cyan}demo${C.reset}      Run demo scan against demo-target/
  ${C.cyan}index${C.reset}     Build or rebuild the vector index
  ${C.cyan}graph${C.reset}     Build or rebuild the code graph
  ${C.cyan}validate${C.reset}  Validate agent.yaml against gitagent spec
  ${C.cyan}info${C.reset}      Show all agents and skills

${C.bold}scan options:${C.reset}
  --pr N              Scan a GitHub PR by number (requires GITHUB_TOKEN + GITRAILS_REPO)
  --diff HEAD~1..HEAD Scan a local git diff range
  --full              Full repo scan (no diff — use as CI fallback)
  --target dir        Target directory for full scan (default: ./)

${C.bold}demo options:${C.reset}
  --agent sentinel|reviewer|scribe|mirror|all   (default: all)

${C.bold}index options:${C.reset}
  --root dir    Root directory to index (default: ./)
  --rebuild     Force full rebuild (clears existing index)

${C.bold}graph options:${C.reset}
  --root dir    Root directory (default: ./)

${C.bold}Required env:${C.reset}
  GROQ_API_KEY              Free at https://console.groq.com
  GITRAILS_MODEL_HEAVY      e.g. groq:llama-3.3-70b-versatile
  GITRAILS_MODEL_LIGHT      e.g. groq:llama-3.1-8b-instant

${C.bold}GitHub env (for scan --pr):${C.reset}
  GITHUB_TOKEN              repo + pull_requests scopes
  GITRAILS_REPO             owner/repo
  GITHUB_SHA                set automatically in GitHub Actions

${C.bold}Examples:${C.reset}
  gitrails scan --pr 42
  gitrails scan --diff HEAD~1..HEAD
  gitrails scan --full --target ./src
  gitrails demo --agent all
  gitrails index --root ./ --rebuild
`;

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: process.env });
}

const ARGV = process.argv.slice(2);
const cmd  = ARGV[0];

if (!cmd || cmd === '--help' || cmd === '-h') {
  console.log(HELP);
  process.exit(0);
}

if (cmd === '--version' || cmd === '-v') {
  console.log(`gitrails v${VERSION}`);
  process.exit(0);
}

if (cmd === 'scan') {
  const passthrough = ARGV.slice(1).join(' ');
  run(`node scripts/pr-scan.js ${passthrough}`);

} else if (cmd === 'demo') {
  const passthrough = ARGV.slice(1).join(' ');
  run(`node scripts/demo-scan.js ${passthrough}`);

} else if (cmd === 'index') {
  const root    = ARGV.includes('--root')    ? ARGV[ARGV.indexOf('--root') + 1]    : './';
  const rebuild = ARGV.includes('--rebuild') ? ' --rebuild' : '';
  run(`node retrieval/index.js --build${rebuild} --root ${root}`);

} else if (cmd === 'graph') {
  const root = ARGV.includes('--root') ? ARGV[ARGV.indexOf('--root') + 1] : './';
  run(`node retrieval/graph.js --build --root ${root}`);

} else if (cmd === 'validate') {
  run('npx @open-gitagent/gitagent validate');

} else if (cmd === 'info') {
  run('npx @open-gitagent/gitagent info');

} else {
  console.error(`${C.red}Unknown command: ${cmd}${C.reset}`);
  console.log(`Run ${C.cyan}gitrails --help${C.reset} for usage.`);
  process.exit(1);
}
