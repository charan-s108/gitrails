---
name: contradiction-check
description: "Detects rule drift and inconsistent application of detection patterns across the current session. Reports contradictions to dailylog.md without modifying any rules."
license: MIT
allowed-tools: Read Write audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "low"
---

# contradiction-check

Read dailylog.md and knowledge/patterns.md. Group findings by pattern type. Flag if same pattern fired in one file but was missed in another with identical structure, or if severity differs from the pattern's declared value. Append contradiction report to dailylog.md. No source code reads. No rule modifications.
