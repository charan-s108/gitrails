---
name: synthesize
description: "Merges findings from sentinel, reviewer, and scribe into a structured PR comment, sets GitHub Check status, applies PR labels, and triggers mirror for post-session audit."
license: MIT
allowed-tools: Read audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# synthesize

## Instructions

1. Collect the exit code and terminal output from the dispatch skill.
2. Synthesis is fully handled by `scripts/pr-scan.js` — it posts the PR comment, sets the GitHub Check, applies the label, and writes session memory.
3. Report the final verdict (APPROVED / NEEDS_REVIEW / BLOCKED) and risk score to the user.
