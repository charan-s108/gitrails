---
name: triage
description: "Builds a scoped dispatch plan for the current PR using semantic search and code graph analysis. Determines priority and scope for each sub-agent."
license: MIT
allowed-tools: cli Read audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# triage

## Instructions

1. Run `node retrieval/index.js --query "hardcoded credentials auth key secret"` and `node retrieval/graph.js --hotspots --threshold 8` using the cli tool.
2. Cross-reference results with changed files from PR context.
3. Flag auth/config/credential files as `sentinelPriority: CRITICAL`, hotspot files as `reviewerPriority: HIGH`.
4. Return priority plan to dispatch.
