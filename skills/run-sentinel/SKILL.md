---
name: run-sentinel
description: "Sentinel security analysis — reads sentinel context inline and scans the diff for OWASP A01-A09 violations and hardcoded secrets."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "high"
---

# Run Sentinel

Read sentinel's rules then perform the security scan inline:

1. Read `agents/sentinel/RULES.md` for scanning rules.
2. Using the diff already obtained, scan for:
   - **A07 Secrets**: `AKIA`, `sk-`, `ghp_`, `password =`, `secret =`, `api_key`, `Math.random()` for tokens
   - **A03 Injection**: SQL string concat (`"... WHERE id = " + var`), `eval()`, `exec()`, template literals in queries
   - **A01 Access Control**: missing auth checks, admin flags, debug routes
   - **A05 Misconfiguration**: `debug: true`, `cors: { origin: '*' }`, verbose error output with stack traces
   - **A02 Crypto**: MD5/SHA1 for passwords
3. Cross-reference `knowledge/false-positives.md` via `read` — skip suppressed patterns.
4. Output each finding as: `[SEVERITY] file:line — description (OWASP AXX)`
5. Redact any actual secret values as `[REDACTED]`.
6. If ANY finding is CRITICAL → verdict is BLOCKED. Stop. Do not invoke reviewer or scribe.
