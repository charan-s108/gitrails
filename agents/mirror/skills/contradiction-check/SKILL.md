---
name: contradiction-check
description: "Detects rule drift and inconsistent application of detection patterns across the current session. Reports to dailylog.md only — never modifies rules."
license: MIT
allowed-tools: read write
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "low"
---

# contradiction-check

1. Read `memory/runtime/dailylog.md` — get all findings with file, pattern, severity.
2. Read `../../knowledge/patterns.md` — load expected scope for each active rule.
3. Group findings by pattern. Check if the same pattern fired in some files but was missed in others with identical structure.
4. Check severity drift: compare this session's severity against `memory/runtime/key-decisions.md` if available.
5. Append contradiction report to `memory/runtime/dailylog.md`. No rule changes — report only.
