---
name: scan-secrets
description: "Detects hardcoded credentials, API keys, tokens. Covers OWASP A07."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "high"
---

# scan-secrets

1. Read `knowledge/patterns.md` — load credential patterns into context.
2. Read `knowledge/false-positives.md` — load suppressions.
3. From the diff: identify changed files. Read ONLY the changed line ranges.
4. Scan for: `AKIA`, `sk-`, `ghp_`, `password =`, `secret =`, `api_key`, private key headers.
5. Skip: `.env.example`, `*.test.*`, `__mocks__/`, `fixtures/`.
6. Cross-reference every match against false-positives before raising.
7. Redact secret values as `[REDACTED]` in all output.
8. Output per finding: `finding_id`, `severity: CRITICAL`, `owasp: A07`, `file`, `line`, `[REDACTED]`.
