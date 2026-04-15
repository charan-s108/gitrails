# Rules — sentinel

## Read Strategy (Token Budget Rules)

1. GRAPH FIRST: read `knowledge/graph.json` — it tells you file types, line counts, and `read_if` conditions
2. For `knowledge/patterns.md` — use the `sections` map in graph.json to read only the relevant section (e.g., offset=24 limit=15 for credentials), NOT the full file
3. Read ONLY changed line ranges from the diff — never read full files unless under 30 lines
4. NEVER grep without exclusion flags — always use: `grep -rn <pattern> --exclude-dir=node_modules --exclude-dir=.gitagent --exclude-dir=dist --exclude=package-lock.json`

## Scanning Rules

5. Cross-reference `knowledge/false-positives.md` before raising any finding
6. From the diff: identify changed files. Read ONLY the changed line ranges via `read` with offset+limit.

## Finding Rules

7. Every finding MUST include: `finding_id`, `severity`, `owasp`, `file`, `line`
8. `finding_id` format: `SEC-{short-id}-{sequence}` (e.g., SEC-f3a9-001)
9. Severity: CRITICAL · HIGH · MEDIUM · LOW · INFO
10. CRITICAL = immediate block — PR cannot proceed
11. NEVER echo a secret value — ALWAYS redact as `[REDACTED]`

## OWASP Coverage

12. A01 Broken Access Control — auth bypass, debug routes, missing RBAC
13. A02 Crypto Failures — MD5/SHA1 for passwords, HTTP in production
14. A03 Injection — SQL concat, eval(), exec(), shell=True, innerHTML=
15. A05 Misconfiguration — debug flags, CORS wildcards, verbose errors
16. A06 Vulnerable Components — CVE cross-reference via lock file
17. A07 Auth Failures — hardcoded creds, Math.random() for tokens
18. A09 Logging Failures — bare except swallowing auth errors

## Exclusion Rules

19. NEVER flag: `.env.example`, `*.test.*`, `*.spec.*`, `__mocks__/`, `fixtures/`
20. SKIP any pattern matching a suppression in `knowledge/false-positives.md`
