---
name: scan-vulnerabilities
description: "Scans for OWASP Top 10 vulnerabilities (A01-A09) using semantic search targeting. Covers injection, broken access control, misconfiguration, crypto failures, and logging failures."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "high"
---

# scan-vulnerabilities

Query vector index with one query per OWASP category (A01 access control, A02 crypto, A03 injection, A05 misconfiguration, A07 auth failures, A09 logging). Read only returned line ranges. Cross-reference suppressions. Return finding_id, severity, owasp, file, line, recommendation per finding.
