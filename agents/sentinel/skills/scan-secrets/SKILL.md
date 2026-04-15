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

1. Read `../../knowledge/graph.json` — check `scan_exclusions.grep_flags` for mandatory exclusion flags.
2. Read `../../knowledge/patterns.md` lines 24-38 only (`offset: 24, limit: 15`) — credential patterns section.
3. Read `../../knowledge/false-positives.md` — load suppressions.
4. From the diff: identify changed files and ONLY their changed line ranges.
5. For each changed file: `read` with `offset` + `limit` to read only the changed lines.
6. Scan for: `AKIA`, `sk-`, `ghp_`, `password =`, `secret =`, `api_key`, private key headers.
7. If grep is needed: `grep -rn <pattern> <file> --exclude-dir=node_modules --exclude-dir=.gitagent --exclude=package-lock.json`
8. Skip: `.env.example`, `*.test.*`, `__mocks__/`, `fixtures/`.
9. Cross-reference every match against false-positives before raising.
10. Redact secret values as `[REDACTED]` in all output.
11. Output per finding: `finding_id`, `severity: CRITICAL`, `owasp: A07`, `file`, `line`, `[REDACTED]`.
