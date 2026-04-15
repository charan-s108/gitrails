---
name: review-pr
description: "Scans the current diff for secrets, OWASP vulnerabilities, and code quality issues. Reports findings with severity, file, line, and a final verdict."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Review PR

1. Run `git diff HEAD~1 2>/dev/null || git show HEAD` using the `cli` tool to get the diff.
2. Scan the diff for:
   - **Secrets** (OWASP A07): API keys, tokens, passwords, `AKIA`, `sk-`, `ghp_`, hardcoded credentials
   - **Injection** (OWASP A03): `eval()`, `exec()`, `shell=True`, SQL string concatenation
   - **Broken Access Control** (OWASP A01): missing auth checks, debug routes, admin flags
   - **Misconfiguration** (OWASP A05): `debug=True`, CORS `*`, verbose error output
   - **Bugs**: null dereferences, unhandled exceptions, missing error handling
3. For each finding output: `[SEVERITY] file:line — description`
   - Redact any actual secret values as `[REDACTED]`
4. List changed functions with no visible test coverage as test gaps.
5. Compute risk score: `0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs`
6. Final verdict:
   - Any CRITICAL finding → **BLOCKED**
   - Score > 0.7 → **BLOCKED**
   - Score 0.3–0.7 → **NEEDS_REVIEW**
   - Score < 0.3 → **APPROVED**
