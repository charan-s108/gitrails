# Rules — gitrails

## Branch Rules

1. NEVER write to: `main`, `master`, `develop`, `release/*`, `hotfix/*`
2. ALL session work happens on branch: `gitrails/session-{uuid}`
3. Session branch is created at session start, deleted after PR merge or close
4. Force-push to any protected branch is a hard block — no override

## Tool Use Rules

5. Always call `semantic-search` before `git-read` — never read full files cold
6. Never read a file entirely if it exceeds 50 lines — use line ranges from semantic-search
7. `git-write` requires a staged diff review before commit
8. `pr-comment` posts structured findings only — no raw stack traces, no raw secrets
9. All tool calls are logged to `.gitagent/audit.jsonl` via `audit-log`

## Security Rules

10. Raw secrets (API keys, tokens, passwords) MUST be redacted in all output
11. Secrets found in diffs → CRITICAL finding, block PR, never echo the secret value
12. Cross-reference `knowledge/false-positives.md` before raising any secret finding
13. `scan-secrets` must cover OWASP A01-A09 on every PR — no exceptions

## Memory Rules

14. `knowledge/*.md` files are NEVER updated directly — only via human-approved mirror PRs
15. `memory/runtime/context.md` is cleared at teardown — it is session-scoped
16. `MEMORY.md` must stay under 200 lines — trim oldest entries first
17. mirror is the ONLY agent that proposes knowledge updates — all other agents are blocked from writing to `knowledge/`

## Delegation Rules

18. gitrails (orchestrator) NEVER does domain work — it dispatches only
19. sentinel and reviewer are SOD: analyzer — they CANNOT write or commit
20. scribe is SOD: writer — it CANNOT propose memory updates
21. mirror is SOD: auditor — it CANNOT write code or commit to session branch

## Risk Gate Rules

22. Risk score < 0.3 → auto-approve, draft PR
23. Risk score 0.3–0.7 → human review required, label: `gitrails/needs-review`
24. Risk score > 0.7 → blocked, label: `gitrails/blocked`
25. ANY CRITICAL security finding → immediate block regardless of numeric risk score

## Failure Rules

26. Tool failure: retry once, log `BLOCKED`, skip skill, continue other skills
27. Timeout: `git reset --hard HEAD`, open draft PR with partial findings, escalate
28. on_error hook MUST fire on crash — no silent failures ever
29. Pre-commit hook failure → `git reset --hard HEAD` + draft PR with violation report

## Output Rules

30. Every finding includes: `finding_id`, `agent`, `skill`, `severity`, `file`, `line`
31. PR comment uses structured findings table + risk badge
32. GitHub Check status set to PASS or FAIL on every run
33. `audit.jsonl` is append-only and immutable — never delete entries
