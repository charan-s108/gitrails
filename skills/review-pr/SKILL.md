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
2. Run `git diff origin/main...HEAD 2>/dev/null | head -c 2500` via `cli` to get a truncated diff. Redact any secrets as `[REDACTED]`.
3. Run sentinel — read `skills/run-sentinel/SKILL.md` and follow its instructions.
4. **GATE**: If sentinel finds ANY CRITICAL → verdict is **BLOCKED**. Output verdict and STOP. Do NOT invoke reviewer, scribe, or mirror.
5. If no CRITICAL → read `skills/run-reviewer/SKILL.md` and follow its instructions.
6. **GATE**: If reviewer risk score > 0.7 → verdict is **BLOCKED**. STOP.
7. If risk 0.3–0.7 → **NEEDS_REVIEW**. If risk < 0.3 → **APPROVED**.
8. Read `skills/run-scribe/SKILL.md` and follow its instructions.
9. Read `skills/run-mirror/SKILL.md` and follow its instructions.
