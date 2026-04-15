---
name: propose-learning
description: "Proposes knowledge updates via a human-approved PR to knowledge/false-positives.md when over-flagged patterns are detected. Never updates knowledge files directly."
license: MIT
allowed-tools: read write cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "standard"
---

# propose-learning

## Purpose

When `audit-decisions` identifies over-flagged findings — patterns that fired
repeatedly without human action — this skill drafts a PR to suppress them.
It writes evidence, rationale, and the exact proposed diff to a PR body, then
opens a draft PR against `knowledge/false-positives.md`.

The PR must be reviewed and approved by a human. mirror never merges its own
proposals.

## Token Budget

propose-learning reads only what's needed to write the PR.

Step 1 — Read audit results:
  Read memory/runtime/dailylog.md (audit section only)
  → over-flagged findings with evidence

Step 2 — Read current false-positives file:
  Read knowledge/false-positives.md
  → current suppression rules (to avoid duplicates)

Step 3 — Compose PR:
  No file reads beyond these two. Draft PR body from audit evidence.
  Use git-write to stage the proposed change to knowledge/false-positives.md.
  Use pr-comment to open the PR.

Rule: Only open a PR if there are confirmed over-flagged findings.
Silence (no PR) is correct when no learning is warranted.
Never open more than one PR per session.

## Instructions

1. Read `memory/runtime/dailylog.md` — find all `over-flagged` verdicts from this session
2. If zero over-flagged findings → skip, log "no learning warranted this session", exit
3. For each over-flagged finding, extract:
   - The pattern (file path glob or content pattern)
   - The number of times it fired
   - The evidence that no action was taken
4. Read `knowledge/false-positives.md` — check if a suppression already exists
5. If suppression already exists → skip that finding
6. Draft the addition to `knowledge/false-positives.md` (append only, never delete)
7. Stage the change with `git-write`
8. Open a draft PR with body format below
9. Log PR URL to `memory/runtime/dailylog.md`

## Output Format

PR title: `mirror: suppress — {one-line description}`

PR body:
```markdown
## mirror Learning Proposal

**Session**: {session-uuid}
**Date**: {date}
**Proposed by**: mirror (auditor)

### Evidence

The following pattern was flagged {n} times across {n} sessions with no
action taken by the development team:

| session | finding_id | file | line | severity |
|---------|------------|------|------|----------|
| {uuid}  | SEC-XXX    | ...  | ...  | LOW      |

### Proposed Change

Add to `knowledge/false-positives.md`:

```
## {pattern-name}
- pattern: {glob or content pattern}
- reason: {why this is a false positive for this codebase}
- added_by: mirror
- session: {uuid}
- date: {date}
```

### Rationale

{2-3 sentence explanation of why this is a false positive and not a
suppressed real vulnerability}

### Human Decision

Merge this PR to teach gitrails to suppress this pattern.
Close this PR if you believe the findings were valid.

⚠️ This PR was opened by mirror. It requires human approval to merge.
```
