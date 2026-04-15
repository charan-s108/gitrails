---
name: triage
description: "Builds a scoped dispatch plan for the current PR using semantic search and code graph analysis. Determines priority and scope for each sub-agent."
license: MIT
allowed-tools: cli read audit-log semantic-search
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Triage

## Purpose

Triage runs first on every PR. It builds the dispatch plan that determines
which agents are invoked and how urgently. It never does domain work itself —
it only scopes and prioritizes.

## Instructions

1. Identify changed files from the PR context (branch, diff, or PR number).

2. Use the `semantic-search` tool to scan for high-risk patterns across the
   changed files:
   - Query 1: `"hardcoded credentials api key password secret token env"`
   - Query 2: `"sql injection user input string concatenation exec eval"`
   - Query 3: `"authentication bypass debug route admin flag missing check"`

3. Cross-reference returned file paths against the PR's changed file list to
   confirm relevance.

4. Check code graph data (`knowledge/graph.json`) for changed files: identify
   any with `complexity >= 8` as hotspots for reviewer priority.

5. Classify files into priority tiers:
   - `sentinelPriority: CRITICAL` — auth, config, env, credentials, secrets
   - `sentinelPriority: HIGH` — any file returned by security queries above
   - `reviewerPriority: HIGH` — hotspot files from code graph
   - `scribePriority: STANDARD` — all changed files with public-facing functions

6. Return the dispatch plan as a structured object:
   ```
   {
     pr: <number or ref>,
     sentinel: { priority: "CRITICAL|HIGH|STANDARD", files: [...] },
     reviewer: { priority: "HIGH|STANDARD", hotspots: [...] },
     scribe:   { priority: "STANDARD|LOW", files: [...] },
     skip_scribe: <true if sentinel returns CRITICAL finding>
   }
   ```

## Token Budget

Use `semantic-search` first — it returns file paths and line ranges only.
Read only those specific line ranges via `read`. Never cold-read full files.
Triage should consume no more than 400 tokens of context total.
