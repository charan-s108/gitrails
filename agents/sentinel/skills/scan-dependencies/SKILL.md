---
name: scan-dependencies
description: "Scans lock files for packages with known CVEs. Covers OWASP A06 Vulnerable and Outdated Components. Reads only lock files, never source files."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "standard"
---

# scan-dependencies

Read only changed lock files (package-lock.json, yarn.lock). Extract package versions and flag known vulnerable version ranges (jsonwebtoken <9, lodash <4.17.21, axios <1.6.0, express <4.18.0). Cross-reference knowledge/false-positives.md. Return finding_id, package, version, cve, severity per finding.
