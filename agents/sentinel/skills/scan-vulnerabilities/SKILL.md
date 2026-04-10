---
name: scan-vulnerabilities
description: "Scans for OWASP Top 10 vulnerabilities (A01-A09) using semantic search targeting. Covers injection, broken access control, misconfiguration, crypto failures, and logging failures."
license: MIT
allowed-tools: Read cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "high"
---

# scan-vulnerabilities

## Purpose

Systematic OWASP A01-A09 sweep of changed code using semantic search
to target only the relevant line ranges. Never reads entire files.
Each OWASP category has a dedicated semantic-search query.

## Token Budget

Always use semantic-search BEFORE git-read. Never read full files.

Step 1 — Query the vector index (one query per OWASP category):
  A01: cli: node retrieval/index.js --query "access control authorization check bypass rbac missing"
  A02: cli: node retrieval/index.js --query "md5 sha1 password hash http plain text crypto weak"
  A03: cli: node retrieval/index.js --query "sql injection string concatenation eval exec innerHTML user input"
  A05: cli: node retrieval/index.js --query "debug true cors wildcard verbose error stack trace production"
  A06: (handled by scan-dependencies)
  A07: cli: node retrieval/index.js --query "Math.random token session hardcoded password auth rate limit"
  A09: cli: node retrieval/index.js --query "bare except catch swallow error log auth silent failure"
  → returns JSON [{ file, start_line, end_line, score }]

Step 2 — Read only the returned line range:
  cli: sed -n '<start_line>,<end_line>p' <file>

Step 3 — Cross-reference suppressions before raising any finding.

Rule: Never read an entire file unless it is under 50 lines total.

## Instructions

1. Run all `cli: node retrieval/index.js --query "..."` commands listed above
2. Group results by OWASP category
3. For each result with score > 0.65:
   a. Check against `knowledge/false-positives.md`
   b. If suppressed → skip
   c. If not → git-read the line range
4. Analyze each line range for the relevant OWASP pattern
5. For each confirmed finding, record:
   - finding_id, file, line, severity, OWASP category, description, recommendation
6. Compile all findings and return

## OWASP Detection Criteria

### A01 — Broken Access Control
- Routes without authentication middleware
- Admin endpoints accessible without role check
- Direct object reference without authorization

### A02 — Cryptographic Failures
- `md5(password)`, `sha1(password)` usage
- `http://` in production connection strings
- Hardcoded IV or salt values
- `crypto.createCipher` (deprecated, no IV) instead of `createCipheriv`

### A03 — Injection
- `"SELECT * FROM users WHERE id = " + userId`
- `eval(userInput)`, `exec(userInput)`
- `subprocess.run(..., shell=True)`
- `element.innerHTML = userContent`
- Template literals with unescaped user input in SQL/shell context

### A05 — Security Misconfiguration
- `DEBUG = True` or `debug: true` in production configs
- `Access-Control-Allow-Origin: *` without restriction
- Error responses exposing stack traces
- Default credentials in config files

### A07 — Authentication Failures
- `Math.random()` used to generate session tokens
- Missing rate limiting on `/login`, `/auth` endpoints
- Session not invalidated on logout
- Password comparison without constant-time compare

### A09 — Logging Failures
- `except: pass` or `catch(e) {}` in authentication paths
- Missing audit log for privilege escalation
- Sensitive data (passwords, tokens) logged in plaintext

## Output Format

```json
{
  "skill": "scan-vulnerabilities",
  "agent": "sentinel",
  "findings": [
    {
      "finding_id": "SEC-{uuid}-002",
      "severity": "HIGH",
      "owasp": "A03",
      "category": "SQL Injection",
      "file": "src/db/queries.js",
      "line": 42,
      "description": "String concatenation used to build SQL query with user-supplied input",
      "recommendation": "Use parameterized queries or prepared statements"
    }
  ],
  "owasp_coverage": {
    "A01": "scanned",
    "A02": "scanned",
    "A03": "scanned",
    "A05": "scanned",
    "A06": "see scan-dependencies",
    "A07": "scanned",
    "A09": "scanned"
  }
}
```
