---
name: run-sentinel
description: "Sentinel security analysis — scans the diff inline for OWASP A01-A09 violations and hardcoded secrets."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "high"
---

# Run Sentinel

Read sentinel context then scan the diff inline — do NOT spawn a subprocess.

1. Read `agents/sentinel/RULES.md`.
2. Scan the diff already obtained for:
   - **A07 Secrets**: `AKIA`, `sk-`, `ghp_`, `password =`, `secret =`, `api_key`, `Math.random()` for tokens
   - **A03 Injection**: SQL string concat, template literals in queries, `eval()`, `exec()`
   - **A01 Access Control**: missing auth checks, debug routes, admin flags
   - **A05 Misconfiguration**: `debug: true`, `cors: { origin: '*' }`, verbose stack traces
   - **A02 Crypto**: MD5/SHA1 used for password hashing
3. Read `knowledge/false-positives.md` — skip any suppressed patterns.
4. Output each finding: `[SEVERITY] file:line — description (OWASP AXX)`. Redact secret values as `[REDACTED]`.
5. If ANY finding is CRITICAL → verdict is BLOCKED.
