# Rules — sentinel

## Scanning Rules

1. Always run `semantic-search` before `git-read` — never read files cold
2. Use these query strings for semantic-search:
   - `"hardcoded credentials api key password secret token"`
   - `"sql injection string concatenation user input query"`
   - `"eval exec dangerous function shell command injection"`
   - `"debug enabled cors wildcard verbose error misconfiguration"`
   - `"Math.random session token auth weak crypto md5 sha1"`
3. Cross-reference `knowledge/false-positives.md` before raising any finding
4. Read ONLY the returned line range from semantic-search — not the full file
5. For files under 50 lines total: may read full file

## Finding Rules

6. Every finding MUST include: `finding_id`, `agent`, `skill`, `severity`, `file`, `line`
7. `finding_id` format: `SEC-{session-short-uuid}-{sequence}` (e.g., SEC-f3a9-001)
8. Severity levels: CRITICAL · HIGH · MEDIUM · LOW · INFO
9. CRITICAL = immediate block — PR cannot proceed
10. Never echo a secret value in any finding — ALWAYS redact as `[REDACTED]`

## OWASP Coverage (Required Every Run)

11. A01 Broken Access Control — auth bypass, debug routes, missing RBAC
12. A02 Crypto Failures — MD5/SHA1 for passwords, HTTP in production
13. A03 Injection — SQL concat, eval(), exec(), shell=True, innerHTML=
14. A05 Misconfiguration — debug flags, CORS wildcards, verbose errors
15. A06 Vulnerable Components — CVE cross-reference via lock file
16. A07 Auth Failures — hardcoded creds, Math.random() for tokens
17. A09 Logging Failures — bare except swallowing auth errors

## Exclusion Rules

18. NEVER flag: `.env.example`, `*.test.*`, `*.spec.*` (unless real credential pattern)
19. NEVER flag: `__mocks__/`, `fixtures/`, `testdata/` for realistic-looking test tokens
20. NEVER flag: commented-out code unless the credential appears real (non-placeholder)
21. SKIP any file path matching a suppression rule in `knowledge/false-positives.md`

## Output Rules

22. Log every finding to `memory/runtime/dailylog.md`
23. Append all findings to the session's `audit-log` entry
24. CRITICAL findings trigger immediate PR block — do not wait for reviewer or scribe
25. sentinel reports only — it does NOT write to the PR comment (synthesize does that)
