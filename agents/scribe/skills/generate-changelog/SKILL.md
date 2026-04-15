---
name: generate-changelog
description: "Generates a CHANGELOG.md entry for the current PR describing user-facing behavioral changes. Based on the actual diff, not the PR description alone."
license: MIT
allowed-tools: read write cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "documentation"
  risk_tier: "low"
---

# generate-changelog

## Purpose

Reads the PR diff to understand what user-facing behavior changed, then
writes a structured changelog entry in Keep-a-Changelog format. Never
duplicates the PR title — always describes what the change means for users.

## Token Budget

Always use semantic-search BEFORE git-read. Never read full files.

Step 1 — Use diff metadata (no file reads needed):
  The dispatch plan includes the list of changed files and brief diff summary
  → use this to identify what categories of change occurred

Step 2 — Read only changed API/export surfaces:
  Read `knowledge/graph.json` — get function list for changed files.
  Use `cli` to run `git show HEAD:<file>` for specific line ranges of public/exported functions only.

Step 3 — Read existing CHANGELOG.md:
  Read CHANGELOG.md (full — usually small, needed to prepend entry)

Rule: Read only public API surfaces and the changelog file.
Zero reads of internal implementation files for changelog generation.

## Instructions

1. From dispatch plan: get changed files and PR metadata (title, number, author)
2. Read `knowledge/graph.json` — identify public/exported functions in changed files.
3. For each changed public function: read only its line range from the diff.
4. Categorize changes:
   - `Added` — new features, new endpoints, new exported functions
   - `Changed` — modified behavior of existing features
   - `Fixed` — bug fixes
   - `Removed` — deleted features or API endpoints
   - `Security` — security fixes (link to finding IDs from sentinel)
   - `Breaking Changes` — backward-incompatible changes
5. Read existing CHANGELOG.md to determine current version and format
6. Write the new entry at the top of CHANGELOG.md
7. Stage with git-write and commit

## Changelog Entry Format

```markdown
## [Unreleased] — 2026-04-10

### Breaking Changes
- `validateUser()` now returns `null` instead of throwing on unknown user ID

### Security
- SEC-f3a9-001: Removed hardcoded AWS key from auth config (OWASP A07)

### Added
- `createSession(userId, options)` — creates authenticated session with
  configurable expiry (default 24h)

### Changed
- `getUserProfile()` now accepts optional `includeMetadata` flag

### Fixed
- Null pointer in login flow when user record missing `profile` field
```

## Output Format

```json
{
  "skill": "generate-changelog",
  "agent": "scribe",
  "changelog_entry": "## [Unreleased] — 2026-04-10\n\n### Security\n...",
  "file_written": "CHANGELOG.md",
  "commit": "docs: changelog entry for PR #42 via gitrails/session-f3a9b2c1"
}
```
