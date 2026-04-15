---
name: scan-vulnerabilities
description: "Scans for OWASP A01-A09 vulnerabilities. Covers injection, broken access control, misconfiguration, crypto failures, and logging failures."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "high"
---

# scan-vulnerabilities

1. Read `knowledge/patterns.md` — load OWASP pattern definitions into context.
2. Read `knowledge/false-positives.md` — load suppressions.
3. Read `knowledge/graph.json` — identify which changed files are in auth/db/route paths (higher risk).
4. From the diff: read ONLY changed line ranges, prioritising high-complexity files from graph.
5. Scan each range for:
   - A01: missing auth middleware, direct object reference without check
   - A02: `md5(`/`sha1(` for passwords, `http://` in production strings, hardcoded IV
   - A03: SQL string concatenation with user input, `eval(`, `exec(`, `shell=True`, `innerHTML=`
   - A05: `DEBUG=True`, `cors: *`, stack traces in error responses
   - A07: `Math.random()` for tokens, missing rate limit on auth routes
   - A09: bare `except: pass`, `catch(e){}` swallowing auth errors
6. Cross-reference every match against false-positives before raising.
7. Output per finding: `finding_id`, `severity`, `owasp`, `file`, `line`, `description`, `recommendation`.
