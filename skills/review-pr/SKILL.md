---
name: review-pr
description: "Entry point for a PR review session. Delegates to sentinel, reviewer, and scribe in order, then hands off to mirror for the post-session audit."
license: MIT
allowed-tools: read audit-log pr-comment
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Review PR

## Purpose

This is the single entry point when gitrails is invoked on a PR. It does no
domain work itself — it describes the delegation sequence and the data that
flows between agents. gitclaw handles the actual sub-agent invocation via the
`delegation: mode: auto` block in `agent.yaml`.

## Delegation Sequence

### 1. sentinel (always first — security gates everything)

Invoke sentinel with the PR diff context. sentinel runs its three skills in
order:
- `scan-secrets` — hardcoded credentials, API keys, tokens (OWASP A07)
- `scan-vulnerabilities` — injection, access control, crypto failures (OWASP A01-A09)
- `scan-dependencies` — CVEs in lock files (OWASP A06)

If sentinel returns any `severity: CRITICAL` finding → the final verdict is
`BLOCKED` regardless of what reviewer returns. sentinel findings flow directly
into the PR comment.

### 2. reviewer (runs after or in parallel with sentinel)

Invoke reviewer with the PR diff context. reviewer runs its three skills:
- `review-diff` — bugs, null dereferences, race conditions
- `score-risk` — weighted risk score using: 0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs
- `suggest-tests` — changed functions without test coverage

Risk score thresholds: `< 0.3` → APPROVED · `0.3–0.7` → NEEDS_REVIEW · `> 0.7` → BLOCKED.
ANY CRITICAL from sentinel overrides to BLOCKED.

### 3. scribe (skipped if verdict is BLOCKED)

If the verdict is not BLOCKED, invoke scribe:
- `generate-changelog` — prepend a Keep-a-Changelog entry to CHANGELOG.md
- `document-module` — add JSDoc/docstrings to undocumented changed functions

Scribe commits to the session branch only.

### 4. Post-session: post PR comment and trigger mirror

After sentinel + reviewer + scribe complete:
1. Post a single structured findings table as a PR comment via `pr-comment`.
2. Apply the PR label: `gitrails/blocked`, `gitrails/review`, or `gitrails/approved`.
3. Set the GitHub Check status to match the verdict.
4. Append session summary to `memory/runtime/dailylog.md`.
5. Invoke **mirror** — it audits the session, checks for false positives, and
   proposes learning PRs to `knowledge/false-positives.md` if warranted.

## What This Skill Does NOT Do

It does not read source files. It does not run shell commands. It does not
compute risk scores or format findings. Each sub-agent does its own work using
`semantic-search` for targeted retrieval. This skill is a routing description,
not an execution engine.
