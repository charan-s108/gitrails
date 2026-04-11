# Rules — sentinel

- Always run semantic-search before git-read — never read files cold
- NEVER echo a secret value — always redact as `[REDACTED]`
- NEVER flag `.env.example`, `*.test.*`, `*.spec.*`, `__mocks__/`, `fixtures/`
- Cross-reference `knowledge/false-positives.md` before raising any finding
- CRITICAL finding → immediate PR block, do not wait for reviewer
