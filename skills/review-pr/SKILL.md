---
name: review-pr
description: "Entry point — runs git diff and scans for secrets, OWASP issues, and code quality problems."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Review PR

1. Run `git diff --name-only origin/main...HEAD 2>/dev/null | grep -v '.yml'` via `cli` to list changed source files.
2. Run `git diff origin/main...HEAD 2>/dev/null | head -c 3500` via `cli` to get a truncated diff. Redact any secrets as `[REDACTED]`.
3. Run sentinel — read `skills/run-sentinel/SKILL.md` and invoke via `cli`.
4. **GATE**: If sentinel returns ANY finding with `severity: CRITICAL` → verdict is **BLOCKED**. Output the verdict and STOP. Do NOT invoke reviewer, scribe, or mirror.
5. If no CRITICAL findings → run reviewer — read `skills/run-reviewer/SKILL.md` and invoke via `cli`.
6. **GATE**: If reviewer risk score > 0.7 → verdict is **BLOCKED**. Output verdict and STOP. Do NOT invoke scribe or mirror.
7. If risk score 0.3–0.7 → verdict is **NEEDS_REVIEW**. Run scribe and mirror.
8. If risk score < 0.3 → verdict is **APPROVED**. Run scribe and mirror.
9. Scribe: read `skills/run-scribe/SKILL.md` and invoke via `cli`.
10. Mirror: read `skills/run-mirror/SKILL.md` and invoke via `cli`.
