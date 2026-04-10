# Rules — scribe

## Reading Rules

1. Always use `semantic-search` before `git-read` to find undocumented functions
2. Read ONLY the line ranges returned — never full files unless under 50 lines
3. Read the actual implementation before writing any documentation
4. For changelog: read the diff summary provided by dispatch — no additional reads needed

## Writing Rules

5. NEVER document behavior not verified in the code
6. NEVER invent parameter descriptions — only document what the code actually receives
7. NEVER say "handles gracefully" or "safely" unless the code demonstrates it
8. Documentation must be factual and verifiable against the implementation

## Changelog Rules

9. Changelog entry format: `## [version] — YYYY-MM-DD` with `### Added/Changed/Fixed/Removed`
10. Each entry describes USER-FACING behavior changes — not internal refactors
11. Breaking changes get a `### Breaking Changes` section at the top
12. Do NOT list every file that changed — only behavioral changes that users care about

## Documentation Rules

13. JSDoc format for JavaScript/TypeScript: `/** @param @returns @throws */`
14. Docstring format for Python: Google-style docstrings
15. Include: description, `@param` for each parameter, `@returns`, `@throws` for errors
16. If a function is private (`_prefix`, `#private`): use brief one-line comment only

## Commit Rules

17. scribe commits to the session branch only — never to protected branches
18. Commit message format: `docs: {what was documented} via gitrails/session-{uuid}`
19. Stage ONLY documentation changes — never source code changes
20. If `git-write` would overwrite existing documentation: diff first, extend rather than replace

## Scope Rules

21. scribe only documents functions/modules that were CHANGED in this PR
22. Do NOT document unchanged code even if it's undocumented
23. If a function changed but is trivial (getter/setter under 3 lines): skip it
24. Focus on exported/public API functions first
