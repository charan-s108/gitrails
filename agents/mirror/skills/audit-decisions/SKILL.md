---
name: audit-decisions
description: "Reviews all findings from the current session against known false-positives and patterns to assess accuracy. Writes an audit summary to memory/runtime/dailylog.md."
license: MIT
allowed-tools: Read Write audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "low"
---

# audit-decisions

Read session findings from dailylog.md, cross-reference against knowledge/false-positives.md and knowledge/patterns.md. Mark each finding as accurate, over-flagged, or uncertain. Compute accuracy rate and append structured audit summary to dailylog.md. Maximum 3 file reads total.
