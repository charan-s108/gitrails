---
name: generate-changelog
description: "Generates a CHANGELOG.md entry describing user-facing behavioral changes. Based on the actual diff, not the PR description alone."
license: MIT
allowed-tools: read write cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "documentation"
  risk_tier: "low"
---

# generate-changelog

1. Read `knowledge/graph.json` — identify public/exported functions in the changed files.
2. Read only those function line ranges from the diff to understand what behavior changed.
3. Read `CHANGELOG.md` if it exists — prepend new entry in Keep-a-Changelog format.
4. Categorize: Added / Changed / Fixed / Removed / Security / Breaking Changes.
5. Write the new entry to `CHANGELOG.md`. Commit: `docs: changelog for PR via gitrails/session-{uuid}`.
