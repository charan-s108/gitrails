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

Query vector index for credential patterns. Read only returned line ranges. Cross-reference knowledge/false-positives.md before raising any finding. Redact actual secret values as [REDACTED]. Return finding_id, severity, file, line, owasp per finding.
