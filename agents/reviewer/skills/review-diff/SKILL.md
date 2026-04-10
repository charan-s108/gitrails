---
name: review-diff
description: "Analyzes PR diff for bugs, logic errors, null pointer risks, race conditions, and missing edge cases using semantic search targeting and code graph traversal."
license: MIT
allowed-tools: Read cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "standard"
---

# review-diff

## Purpose

Performs targeted code review of the PR diff. Uses semantic search to locate
high-risk patterns in the changed code, and the code graph to identify impact
scope without reading un-changed files. Produces a structured finding list
for input to score-risk.

## Token Budget

Always use semantic-search BEFORE git-read. Never read full files.

Step 1 — Query the vector index:
  cli: node retrieval/index.js --query "null pointer undefined reference missing null check"
  cli: node retrieval/index.js --query "error handling missing try catch async await rejection"
  cli: node retrieval/index.js --query "race condition concurrency async parallel state mutation"
  → returns JSON [{ file, start_line, end_line, score }]

Step 2 — Read only the returned line range:
  cli: sed -n '<start_line>,<end_line>p' <file>
  → 30-80 lines instead of 500

Step 3 — For impact analysis:
  cli: node retrieval/graph.js --hotspots
  → zero additional file reads needed

Rule: Never read an entire file unless it is under 50 lines total.
Token saving: typically 70-90% vs full-file reads.

## Instructions

1. From the dispatch plan, get the list of changed files and functions
2. Run all three `cli: node retrieval/index.js --query "..."` commands above
3. For each result with score > 0.65:
   a. `cli: sed -n '<start>,<end>p' <file>` to read the returned line range
   b. Analyze for: null dereference, missing error handling, logic errors,
      off-by-one, unhandled async rejection, type coercion bugs
4. Run `cli: node retrieval/graph.js --hotspots` to flag high-complexity files
   and assess blast radius
6. Produce structured findings with specific line references
7. Return finding list to score-risk

## Finding Categories

- `null-dereference` — accessing property of potentially null/undefined value
- `unhandled-rejection` — async function with no catch or .catch()
- `missing-error-case` — switch/if with no default/else for error condition
- `type-coercion` — loose equality (`==`) where strict (`===`) is needed
- `logic-error` — condition that appears inverted or impossible
- `race-condition` — shared state mutated in concurrent async paths
- `complexity-increase` — change significantly increases cyclomatic complexity

## Output Format

```json
{
  "skill": "review-diff",
  "agent": "reviewer",
  "findings": [
    {
      "finding_id": "REV-{uuid}-001",
      "severity": "MEDIUM",
      "type": "null-dereference",
      "file": "src/auth/login.js",
      "line": 34,
      "description": "user.profile accessed without null check; user may be undefined on failed DB lookup",
      "recommendation": "Add null check: if (!user) return res.status(404).json({ error: 'User not found' })"
    }
  ],
  "impact_analysis": {
    "changed_functions": ["validateUser", "createSession"],
    "callers": ["src/routes/auth.js", "src/middleware/session.js"],
    "hotspot_files": [{ "file": "src/auth/login.js", "complexity": "18" }]
  }
}
```
