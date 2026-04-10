---
name: scan-secrets
description: "Detects hardcoded credentials, API keys, tokens, and passwords in code changes using semantic search targeting. Covers OWASP A07 Authentication Failures."
license: MIT
allowed-tools: Read cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "high"
---

# scan-secrets

## Purpose

Finds hardcoded credentials before they reach the repository history.
Uses semantic search to target the specific lines most likely to contain
secrets — never reads entire files. Cross-references suppression rules to
avoid flagging known test fixtures and placeholder values.

## Token Budget

Always use semantic-search BEFORE git-read. Never read full files.

Step 1 — Query the vector index:
  cli: node retrieval/index.js --query "hardcoded credentials api key password secret token"
  cli: node retrieval/index.js --query "AWS AKIA access key secret environment variable"
  cli: node retrieval/index.js --query "database password connection string hardcoded"
  → returns JSON [{ file, start_line, end_line, score }]

Step 2 — Read only the returned line range:
  cli: sed -n '<start_line>,<end_line>p' <file>
  → 30-80 lines instead of the full file

Step 3 — Cross-reference suppressions:
  Read knowledge/false-positives.md (cached in context from bootstrap)
  → skip any file/pattern that is suppressed

Rule: Never read an entire file unless it is under 50 lines total.
Token saving: typically 95%+ for secret detection vs full-file reads.

## Instructions

1. Run all three `cli: node retrieval/index.js --query "..."` commands above
2. Deduplicate results (same file/line range may appear in multiple queries)
3. For each result with score > 0.7:
   a. Check if path matches a suppression in `knowledge/false-positives.md`
   b. If suppressed → skip, log suppression applied
   c. If not suppressed → git-read the line range
4. Analyze each line range for:
   - Hardcoded API keys (AWS AKIA*, GCP AIza*, Stripe sk_live_*, etc.)
   - Hardcoded passwords in config files or code
   - Private keys (BEGIN RSA PRIVATE KEY, BEGIN EC PRIVATE KEY)
   - Tokens in source code (not .env files)
   - Connection strings with embedded credentials
5. For each confirmed finding:
   - Redact the actual secret value as `[REDACTED]`
   - Assign severity: CRITICAL if production-pattern, HIGH if dev-pattern
   - Record: finding_id, file, line, severity, pattern matched
6. Findings with zero matches → log "no secrets detected" + exit clean

## Output Format

```json
{
  "skill": "scan-secrets",
  "agent": "sentinel",
  "findings": [
    {
      "finding_id": "SEC-{uuid}-001",
      "severity": "CRITICAL",
      "type": "hardcoded-api-key",
      "file": "src/auth/config.js",
      "line": 14,
      "pattern": "AWS access key (AKIA...)",
      "value": "[REDACTED]",
      "owasp": "A07",
      "recommendation": "Move to environment variable. Rotate this key immediately."
    }
  ],
  "scanned_ranges": [
    { "file": "src/auth/config.js", "lines": "12-18", "tokens_used": 48 }
  ],
  "suppressions_applied": [],
  "token_savings_pct": 99.6
}
```
