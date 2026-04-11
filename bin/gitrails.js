#!/usr/bin/env node
/**
 * gitrails CLI entry point
 *
 * Usage:
 *   gitrails scan [--pr N | --diff REF | --full]
 *   gitrails demo [--agent sentinel|reviewer|scribe|mirror|all]
 *   gitrails index [--rebuild]
 *   gitrails graph
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const ARGV      = process.argv.slice(2);
const cmd       = ARGV[0];
const rest      = ARGV.slice(1).join(' ');

const C = { reset: '\x1b[0m', bold: '\x1b[1m', cyan: '\x1b[36m', gray: '\x1b[90m' };

function run(script, args = '') {
  execSync(`node ${join(ROOT, script)} ${args}`, {
    stdio: 'inherit', cwd: ROOT, env: process.env,
  });
}

switch (cmd) {
  case 'scan':
    run('scripts/pr-scan.js', rest);
    break;

  case 'demo':
    run('scripts/demo-scan.js', rest);
    break;

  case 'index':
    run('retrieval/index.js', `--build --root ./ ${ARGV.includes('--rebuild') ? '--rebuild' : ''}`);
    break;

  case 'graph':
    run('retrieval/graph.js', '--build --root ./');
    break;

  case 'validate':
    try { run('node_modules/.bin/gitagent', 'validate'); } catch {
      execSync('npx @open-gitagent/gitagent validate', { stdio: 'inherit', cwd: ROOT });
    }
    break;

  case 'info':
    try { run('node_modules/.bin/gitagent', 'info'); } catch {
      execSync('npx @open-gitagent/gitagent info', { stdio: 'inherit', cwd: ROOT });
    }
    break;

  default:
    console.log(`
${C.bold}${C.cyan}gitrails${C.reset}  — self-aware engineering teammate

${C.bold}Commands:${C.reset}
  ${C.bold}scan${C.reset}      Run production scanner
               --pr N          Review PR number N
               --diff REF      Diff against git ref (e.g. HEAD~1..HEAD)
               --full          Full repo scan

  ${C.bold}demo${C.reset}      Run demo scanner on demo-target/
               --agent sentinel | reviewer | scribe | mirror | all

  ${C.bold}index${C.reset}     Build/update vector index
               --rebuild       Force full rebuild

  ${C.bold}graph${C.reset}     Build code graph

  ${C.bold}validate${C.reset}  Run gitagent spec validator
  ${C.bold}info${C.reset}      Show agent + skill info

${C.gray}Env: GROQ_API_KEY  GITHUB_TOKEN  GITRAILS_MODEL_HEAVY  GITRAILS_MODEL_LIGHT${C.reset}
`);
    break;
}
