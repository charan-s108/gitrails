---
name: triage
description: "Builds a scoped dispatch plan for the current PR using semantic search and code graph analysis. Determines priority and scope for each sub-agent."
license: MIT
allowed-tools: Read cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# triage

## Purpose

Before any agent reads any code, triage builds a precise dispatch plan by
querying the vector index and code graph. It determines which files are
relevant, what the risk priority is, and which agents should run at what scope.

This is the entry point for every PR review session. Getting triage right
means all downstream agents work efficiently.

## Token Budget

Always use semantic-search BEFORE any file reads. Never read full files.

Step 1 — Query the vector index for diff-relevant content:
  cli: node retrieval/index.js --query "hardcoded credentials authentication"
  cli: node retrieval/index.js --query "complexity high risk function critical path"
  cli: node retrieval/index.js --query "public API export interface endpoint"
  → returns JSON [{ file, start_line, end_line, score }]

Step 2 — Query the code graph:
  cli: node retrieval/graph.js --hotspots --threshold 10
  → returns JSON [{ file, complexity }] — zero file reads needed

Step 3 — Cross-reference with dispatch context:
  Use PR metadata (changed files list) to scope the dispatch plan
  No file reads beyond graph/index queries

Rule: triage produces a plan, not findings. It reads nothing beyond
what's needed to scope the dispatch.

## Instructions

1. Receive PR context: PR number, changed files list, PR description
2. Run all three semantic-search queries above using `cli`
3. Run `cli: node retrieval/graph.js --hotspots` to identify complexity hotspots in changed files
4. Build dispatch plan:
   a. Security priority: HIGH if auth/config/credential files changed, STANDARD otherwise
   b. Review priority: HIGH if hotspot files changed, STANDARD otherwise
   c. Docs priority: LOW (always runs last, skipped if BLOCKED)
5. Return dispatch plan to orchestrator

## Dispatch Plan Format

```json
{
  "skill": "triage",
  "pr": { "number": 42, "branch": "fix/auth-module", "changed_files": 5 },
  "dispatch_plan": {
    "sentinel": {
      "priority": "CRITICAL",
      "scope": ["src/auth/config.js", "src/auth/login.js"],
      "top_results": [
        { "file": "src/auth/config.js", "start_line": "12", "end_line": "18", "score": 0.97 }
      ],
      "reason": "auth/config files changed — credential scan required"
    },
    "reviewer": {
      "priority": "HIGH",
      "scope": ["src/auth/login.js"],
      "hotspots": [{ "file": "src/auth/login.js", "complexity": "18" }],
      "reason": "login.js is a complexity hotspot (score 18)"
    },
    "scribe": {
      "priority": "LOW",
      "scope": ["src/auth/login.js"],
      "reason": "changed public functions may need documentation"
    }
  },
  "estimated_api_calls": 9
}
```
