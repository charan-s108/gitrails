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

1. Run `git diff HEAD~1 2>/dev/null || git show HEAD` via `cli`.
2. Scan diff for: secrets (OWASP A07), injection (A03), access control (A01), misconfiguration (A05), bugs.
3. Redact any credential values as `[REDACTED]`.
4. Read `skills/run-sentinel/SKILL.md` — then use `cli` to run the exact command in that skill.
5. Read `skills/run-reviewer/SKILL.md` — then use `cli` to run the exact command in that skill.
6. If verdict is NOT BLOCKED: read `skills/run-scribe/SKILL.md` and use `cli` to run it.
7. Read `skills/run-mirror/SKILL.md` — then use `cli` to run the exact command in that skill.
8. Verdict: CRITICAL → BLOCKED · >0.7 → BLOCKED · 0.3–0.7 → NEEDS_REVIEW · <0.3 → APPROVED

IMPORTANT: Sub-agents are invoked via the `cli` tool — NOT as function calls. Read each run-* skill to get the exact command.
