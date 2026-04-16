---
name: run-scribe
description: "Scribe documentation — generates changelog entry and JSDoc for changed functions. Skipped if verdict is BLOCKED."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Scribe

Skip entirely if verdict is BLOCKED.

1. Read `agents/scribe/RULES.md`.
2. From the diff, identify all new or changed public/exported functions.
3. Generate a one-line changelog entry: `- feat/fix: <what changed> in <file>`
4. For each undocumented public function generate a JSDoc stub:
   `/** @param @returns */`
5. Output the changelog entry and all JSDoc stubs.
6. Never invent behavior not present in the diff.
