---
name: audit-decisions
description: "Reviews session findings against false-positives and patterns to assess accuracy. Appends audit summary to memory/runtime/dailylog.md."
license: MIT
allowed-tools: read write
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "low"
---

# audit-decisions

1. Read `memory/runtime/dailylog.md` — get all findings from this session.
2. Read `../../knowledge/false-positives.md` — load suppressions.
3. Read `../../knowledge/patterns.md` — load active detection rules.
4. For each finding: mark as accurate (matches pattern), over-flagged (matches suppression), or uncertain.
5. Compute accuracy rate. Append structured audit summary to `memory/runtime/dailylog.md`.
