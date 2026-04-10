---
name: scan-dependencies
description: "Scans lock files for packages with known CVEs. Covers OWASP A06 Vulnerable and Outdated Components. Reads only lock files, never source files."
license: MIT
allowed-tools: Read cli audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "standard"
---

# scan-dependencies

## Purpose

Reads package lock files (package-lock.json, yarn.lock, Pipfile.lock,
go.sum) from the changed files list and checks for packages with known
security advisories. Uses the npm audit data embedded in package-lock.json
where available, and flags suspicious version patterns.

## Token Budget

scan-dependencies reads lock files directly — no semantic search needed
because lock files are small and structured.

Step 1 — Identify changed lock files:
  From the diff scope: filter for package-lock.json, yarn.lock, Pipfile.lock
  → read ONLY changed lock files, not unchanged ones

Step 2 — Read lock files:
  read: package-lock.json (full — lock files are structured data, not prose)
  → parse dependency list

Step 3 — Check for known vulnerable patterns:
  Cross-reference package versions against known CVE version ranges
  (embedded knowledge — no external API calls required)

Rule: Only read lock files. Never read node_modules/. Never call external
vulnerability APIs (no network calls — use embedded CVE knowledge).

## Instructions

1. From the dispatch plan, identify any lock files in the changed file set
2. If no lock files changed → log "no lock file changes" and exit clean
3. For each changed lock file:
   a. read the full lock file (they are typically < 500 lines for small projects)
   b. Extract: package names + resolved versions
4. Check each package against known vulnerable version ranges:
   - Flag packages with CVEs in commonly-exploited libraries
   - Focus on: authentication libs, crypto libs, HTTP parsing, serialization
5. Flag any package added or upgraded in this PR (new risk surface)
6. Cross-reference against `knowledge/false-positives.md` for suppressed packages
7. Produce findings for HIGH/CRITICAL severity CVEs only (suppress INFO noise)

## Known High-Priority Package Patterns

Flag these package categories for version review:
- `jsonwebtoken` < 9.0.0 — JWT signature bypass vulnerabilities
- `lodash` < 4.17.21 — prototype pollution
- `minimist` < 1.2.6 — prototype pollution
- `node-fetch` < 2.6.7 — SSRF exposure
- `axios` < 1.6.0 — SSRF, credential exposure
- `express` < 4.18.0 — various security fixes
- `serialize-javascript` < 6.0.2 — XSS via serialization

## Output Format

```json
{
  "skill": "scan-dependencies",
  "agent": "sentinel",
  "findings": [
    {
      "finding_id": "SEC-{uuid}-003",
      "severity": "HIGH",
      "owasp": "A06",
      "type": "vulnerable-dependency",
      "package": "lodash",
      "version": "4.17.15",
      "cve": "CVE-2021-23337",
      "description": "Prototype pollution via lodash.set — upgrade to 4.17.21+",
      "recommendation": "npm install lodash@latest"
    }
  ],
  "packages_scanned": 47,
  "new_packages_in_pr": ["axios@1.4.0"],
  "suppressions_applied": []
}
```
