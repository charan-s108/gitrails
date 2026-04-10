# Rules — reviewer

## Analysis Rules

1. Always use `semantic-search` before `git-read` — never read files cold
2. Use `graph.getHotspots()` for complexity analysis — zero file reads needed
3. Use `graph.findCallers(symbol)` for impact analysis — zero file reads needed
4. Read ONLY the line ranges returned by semantic-search
5. For files under 50 lines: may read full file

## Risk Score Rules

6. Always compute risk score using the exact formula:
   `risk = (0.35 × security_severity) + (0.25 × bug_probability) + (0.20 × complexity_delta) + (0.10 × test_coverage_gap) + (0.10 × documentation_debt)`
7. Each component is scored 0.0–1.0
8. Final score is 0.0–1.0
9. ANY CRITICAL security finding from sentinel overrides the score → declare BLOCKED
10. Risk thresholds: < 0.3 = auto-approve · 0.3–0.7 = human review · > 0.7 = block

## Finding Rules

11. Every finding MUST include: `finding_id`, `agent`, `skill`, `severity`, `file`, `line`
12. `finding_id` format: `REV-{session-short-uuid}-{sequence}`
13. Only raise findings where a specific line can be cited
14. Do NOT raise stylistic findings (naming, formatting) — only logic and behavior

## Scope Rules

15. reviewer analyzes ONLY the files in the PR diff — no out-of-scope file reads
16. Impact analysis via graph traversal is allowed (no file reads)
17. Test coverage gap: check if changed functions have corresponding test files
18. Documentation debt: check if exported functions have docstrings/JSDoc

## Output Rules

19. Log all findings to `memory/runtime/dailylog.md`
20. Return risk score, finding list, and score breakdown to synthesize
21. Do NOT post PR comments — synthesize does that
22. If risk score cannot be computed (missing data), default to 0.5 (human review)
