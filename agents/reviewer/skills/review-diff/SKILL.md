---
name: review-diff
description: "Analyzes PR diff for bugs, logic errors, null pointer risks, and race conditions. Uses knowledge graph to scope impact without reading unchanged files."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "standard"
---

# review-diff

1. Read `../../knowledge/graph.json` — identify which changed files have highest complexity scores. Prioritise those.
2. From the diff: read ONLY changed line ranges from high-complexity files first.
3. Scan each range for:
   - `null-dereference` — property access on potentially null/undefined
   - `unhandled-rejection` — async function with no `.catch()` or `try/catch`
   - `missing-error-case` — switch/if with no default/else
   - `type-coercion` — `==` where `===` is needed
   - `race-condition` — shared mutable state in concurrent async paths
   - `logic-error` — inverted condition or impossible branch
4. For each finding: record `file`, `line`, `type`, `description`, `recommendation`.
5. Update `../../knowledge/graph.json` entry if a new file/function appears in the diff.
6. Pass finding list to `score-risk`.
