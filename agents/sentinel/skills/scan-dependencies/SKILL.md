---
name: scan-dependencies
description: "Scans lock files for packages with known CVEs. Covers OWASP A06 Vulnerable and Outdated Components."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "standard"
---

# scan-dependencies

1. From the diff: check if `package-lock.json`, `yarn.lock`, or `Pipfile.lock` changed.
2. If no lock file changed → log "no lock file changes" and exit clean.
3. Read the changed lock file. Extract package names and resolved versions.
4. Flag packages matching known vulnerable version ranges:
   - `jsonwebtoken` < 9.0.0 — JWT signature bypass
   - `lodash` < 4.17.21 — prototype pollution
   - `minimist` < 1.2.6 — prototype pollution
   - `node-fetch` < 2.6.7 — SSRF
   - `axios` < 1.6.0 — SSRF, credential exposure
   - `express` < 4.18.0 — multiple security fixes
5. Flag any package newly added in this PR as requiring review.
6. Cross-reference `../../knowledge/false-positives.md` for suppressed packages.
7. Output per finding: `finding_id`, `severity`, `owasp: A06`, `package`, `version`, `cve`, `recommendation`.
