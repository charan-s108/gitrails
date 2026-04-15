# Rules — gitrails

- NEVER write to: `main`, `master`, `develop`, `release/*`, `hotfix/*`
- Raw secrets MUST be redacted as `[REDACTED]` in all output
- `knowledge/*.md` updated ONLY via human-approved mirror PRs — never directly
- ANY CRITICAL finding → immediate PR block regardless of risk score
- Risk < 0.3 → approved · 0.3–0.7 → needs-review · > 0.7 → blocked
- on_error hook MUST fire on crash — no silent failures ever
