# Contributing to gitrails

## Overview

gitrails is a self-learning system. Most "contributions" happen automatically
via the mirror agent's PR proposals. Human contributors primarily review and
approve those proposals, and occasionally extend the agent logic itself.

## Types of Contributions

### 1. Approving Mirror PRs (Most Common)

Mirror opens PRs to `knowledge/false-positives.md` after every session.
These are the primary way gitrails improves. Review mirror's rationale and
merge if it matches your team's conventions.

### 2. Extending Agent Skills

Skills live in `agents/<agent>/skills/<skill-name>/SKILL.md`.
To add a skill:
1. Create the directory and `SKILL.md` with exact frontmatter format
2. Add `semantic-search` to `allowed-tools`
3. Include the Token Budget section
4. Add the skill name to the agent's `agent.yaml`

### 3. Updating Knowledge Base

Never update `knowledge/*.md` directly. Instead:
1. Open a PR with your proposed change
2. Add a comment explaining the rationale
3. gitrails will incorporate it after merge

### 4. Tuning Risk Thresholds

Edit `config/default.yaml` or set env vars in `.env`:
- `GITRAILS_RISK_THRESHOLD` — auto-approve threshold (default 0.3)
- `GITRAILS_TOP_K` — semantic-search result count (default 5)

## Development Setup

```bash
npm install
cp .env.example .env  # fill in GOOGLE_API_KEY and GITHUB_TOKEN
npm run index:build   # build vector index
npm run graph:build   # build code graph
npm run validate      # verify gitagent spec compliance
```

## Coding Standards

- **TypeScript/Node.js only** — no Python, no Docker, no system binaries
- **ES modules** — `"type": "module"` in package.json, use `import/export`
- **No secrets in code** — all secrets via `.env` only
- **Spec compliance** — `npm run validate` must exit 0 after any change
- **SKILL.md frontmatter** — `metadata` values must be quoted strings

## Branch Naming

gitrails creates its own branches: `gitrails/session-{uuid}`
Human contributors use: `feature/description`, `fix/description`
Never push directly to `main`.

## Commit Messages

```
feat: description of new capability
fix: description of bug fixed
docs: documentation update
chore: tooling, config, dependency changes
```

## Filing Issues

Found a false positive? Open an issue with:
- The finding ID (e.g., `SEC-001`)
- The file and line that was flagged
- Why it's a false positive for your codebase

Mirror will propose a suppression rule after the next session.
