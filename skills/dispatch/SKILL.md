---
name: dispatch
description: "Invokes sentinel, reviewer, and scribe in parallel according to the triage dispatch plan. Verifies scope before delegation. Collects completion signals."
license: MIT
allowed-tools: cli Read audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# dispatch

## Instructions

1. Extract the PR number or diff reference from the prompt context.
2. Run the production scanner using the cli tool:
   - For a PR: `node scripts/pr-scan.js --pr <PR_NUMBER>`
   - For a local diff: `node scripts/pr-scan.js --diff HEAD~1..HEAD`
   - For a full scan: `node scripts/pr-scan.js --full`
3. The scanner runs all four agents (sentinel, reviewer, scribe, mirror) internally, posts the PR comment, sets the GitHub Check, and writes session memory.
4. Report the exit code and verdict to synthesize.
