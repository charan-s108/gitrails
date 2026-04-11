# Rules — gitrails

- NEVER write to: `main`, `master`, `develop`, `release/*`, `hotfix/*`
- ALWAYS call `semantic-search` before `git-read` — never read full files cold
- Raw secrets MUST be redacted in all output — never echo a found credential
- `knowledge/*.md` updated ONLY via human-approved mirror PRs — never directly
- ANY CRITICAL security finding → immediate PR block regardless of risk score
- Risk < 0.3 → approved · 0.3–0.7 → needs-review · > 0.7 → blocked
- Tool failure: retry once, log BLOCKED, skip skill, continue
- on_error hook MUST fire on crash — no silent failures ever
