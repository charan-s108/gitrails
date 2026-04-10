# False Positives

> Known suppression rules — patterns gitrails should NOT flag.
> Updated via human-approved mirror PRs only.
> Cross-referenced by sentinel before raising any finding.

## Path Suppressions

### env-example-files
- pattern: `.env.example`
- reason: Placeholder key names are intentional — not real credentials
- added_by: default
- date: 2026-04-10

### test-spec-files
- pattern: `**/*.test.{js,ts}`, `**/*.spec.{js,ts}`
- reason: Test files may contain realistic-looking sample data
- scope: credential scans only (security issues in test code still flagged)
- added_by: default
- date: 2026-04-10

## Content Suppressions

<!-- mirror will add entries here after human approval -->
<!-- Format:
## {pattern-name}
- pattern: {glob or content regex}
- reason: {why this is a false positive for this codebase}
- added_by: mirror
- session: {uuid}
- date: {date}
-->
