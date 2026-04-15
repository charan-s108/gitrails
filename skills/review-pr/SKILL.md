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
4. Invoke `run-sentinel` for deep security analysis.
5. Invoke `run-reviewer` for risk scoring.
6. If not BLOCKED: invoke `run-scribe` for documentation.
7. Invoke `run-mirror` for post-session audit.
8. Verdict: CRITICAL → BLOCKED · >0.7 → BLOCKED · 0.3–0.7 → NEEDS_REVIEW · <0.3 → APPROVED
