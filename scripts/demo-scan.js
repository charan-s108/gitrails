#!/usr/bin/env node
/**
 * gitrails demo scan — uses gitclaw SDK directly
 *
 * Scans demo-target/ for security vulnerabilities using the real vector index
 * and code graph. Prints all events (text, tool calls, tool results) to stdout.
 *
 * Usage: node scripts/demo-scan.js
 */

import { execSync } from 'child_process';

// pi-ai reads GEMINI_API_KEY; @google/genai warns when both are set.
// Delete GOOGLE_API_KEY here so only GEMINI_API_KEY is visible to the SDK.
// The CLI path (npm run start) still has GOOGLE_API_KEY via .env for its validation check.
delete process.env.GOOGLE_API_KEY;

// Resolve gitclaw from global npm — it's installed with -g
const gitclawPath = execSync('npm root -g', { encoding: 'utf-8' }).trim() + '/gitclaw/dist/exports.js';
const { query } = await import(gitclawPath);

const SYSTEM_PROMPT_SUFFIX = `
IMPORTANT — TOOL USE REQUIRED:
You must use the \`cli\` tool to execute commands. Do NOT describe commands — run them.

When you want to run semantic search, call the cli tool like this:
  cli({ command: "node retrieval/index.js --query \\"your search query here\\"" })

When you want hotspots, call:
  cli({ command: "node retrieval/graph.js --hotspots --threshold 5" })

When you want to read specific lines from a file, call:
  cli({ command: "sed -n \\"START,ENDp\\" PATH/TO/FILE" })

Always use actual tool calls. Never just describe what you would do.
`;

const SCAN_PROMPT = `You are gitrails — a security-focused code reviewer.

Scan the \`demo-target/\` directory for security vulnerabilities by executing the following steps. Use the \`cli\` tool for EVERY step — do not skip any.

## Step 1 — Run semantic search queries

Call cli tool with each of these commands:
- node retrieval/index.js --query "hardcoded credentials api key password secret token"
- node retrieval/index.js --query "sql injection eval exec innerHTML user input string concatenation"
- node retrieval/index.js --query "Math.random token session debug cors wildcard cors"
- node retrieval/index.js --query "bare catch swallow error log auth silent failure"

## Step 2 — Check code complexity hotspots

Call cli tool: node retrieval/graph.js --hotspots --threshold 5

## Step 3 — Read suspicious lines

For each result from Step 1 with score > 0.15, call cli tool:
  sed -n "START_LINE,END_LINEp" FILE_PATH

## Step 4 — Report findings

After reading the files, produce a structured security report with:
- Finding ID (SEC-001, SEC-002, ...)
- Severity: CRITICAL / HIGH / MEDIUM
- OWASP category (A01-A09)
- File and line number
- Exact code snippet
- Recommendation

Do ALL steps now using cli tool calls. Start with Step 1 immediately.`;

async function main() {
  console.log('gitrails demo scan starting...\n');

  const model = process.env.GITRAILS_MODEL || 'google:gemini-2.5-flash-lite';

  for await (const event of query({
    dir: process.cwd(),
    prompt: SCAN_PROMPT,
    systemPromptSuffix: SYSTEM_PROMPT_SUFFIX,
    model,
  })) {
    switch (event.type) {
      case 'message_update': {
        const e = event.assistantMessageEvent;
        if (e.type === 'text_delta') {
          process.stdout.write(e.delta);
        }
        break;
      }
      case 'message_end':
        process.stdout.write('\n');
        break;
      case 'tool_execution_start':
        process.stdout.write(`\n\x1b[2m▶ ${event.toolName}(${JSON.stringify(event.args)})\x1b[0m\n`);
        break;
      case 'tool_execution_end': {
        if (event.isError) {
          process.stdout.write(`\x1b[31m✗ ${event.toolName} failed\x1b[0m\n`);
        } else {
          const text = event.result?.content?.[0]?.text || '';
          const preview = text.length > 500 ? text.slice(0, 500) + '…' : text;
          if (preview) process.stdout.write(`\x1b[2m${preview}\x1b[0m\n`);
        }
        break;
      }
      case 'agent_end':
        console.log('\n\x1b[2mScan complete.\x1b[0m');
        break;
      case 'system': {
        if (event.subtype === 'error') {
          const msg = event.content || '';
          if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
            console.error('\n\x1b[33m⚠ Rate limit hit (HTTP 429) — Gemini free tier: 10 RPM / 250 RPD\x1b[0m');
            console.error('\x1b[2mWait 60 seconds and retry, or wait until tomorrow if daily quota is exhausted.\x1b[0m');
            console.error('\x1b[2mGet a paid key at https://aistudio.google.com to remove the limit.\x1b[0m\n');
          } else {
            console.error('\x1b[31mSystem error:\x1b[0m', msg.slice(0, 200));
          }
        }
        break;
      }
      case 'error':
        console.error('\x1b[31mError:\x1b[0m', event.error?.message || event);
        break;
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
