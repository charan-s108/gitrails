---
name: audit-decisions
description: "Reviews all findings from the current session against known false-positives and patterns to assess accuracy. Writes an audit summary to memory/runtime/dailylog.md."
license: MIT
allowed-tools: Read Write audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "low"
---

# audit-decisions

## Purpose

After every session, mirror reads what gitrails found and asks: was it right?
This skill cross-references each finding against `knowledge/false-positives.md`
and `knowledge/patterns.md`. It produces an accuracy verdict for each finding
and appends a structured audit summary to `memory/runtime/dailylog.md`.

## Token Budget

audit-decisions reads only targeted files — never the full codebase.

Step 1 — Read session findings:
  Read memory/runtime/dailylog.md (session findings section only)
  → finding_id list + severity + file + line

Step 2 — Read suppression list:
  Read knowledge/false-positives.md
  → known suppressed patterns

Step 3 — Read active patterns:
  Read knowledge/patterns.md
  → active detection rules

Step 4 — Cross-reference:
  For each finding: check if it matches a false-positive suppression
  If yes → mark as over-flagged
  If no + matches pattern → mark as accurate
  If no + no matching pattern → mark as potentially missed

Rule: Never read source code files. audit-decisions judges gitrails' behavior,
not the code itself. File reads limited to 3: dailylog.md, false-positives.md,
patterns.md.

## Instructions

1. Read `memory/runtime/dailylog.md` — extract all findings from this session
2. Read `knowledge/false-positives.md` — load all suppression rules
3. Read `knowledge/patterns.md` — load all active detection patterns
4. For each finding:
   a. Check if the finding's file/pattern matches a suppression rule → over-flagged
   b. Check if the finding matches an active pattern → accurate
   c. If neither → log as uncertain (do not guess)
5. Compute session accuracy: (accurate / total) × 100
6. Append audit summary to `memory/runtime/dailylog.md`
7. Log audit completion to audit-log tool

## Output Format

Appended to `memory/runtime/dailylog.md`:

```markdown
## mirror audit — {timestamp}

### Finding Verdicts
| finding_id | severity | verdict | reason |
|------------|----------|---------|--------|
| SEC-001 | CRITICAL | accurate | matches pattern: hardcoded-api-key |
| REV-003 | LOW | over-flagged | suppressed: test-fixture-tokens |

### Session Accuracy
- Total findings: {n}
- Accurate: {n}
- Over-flagged: {n}
- Uncertain: {n}
- Accuracy rate: {pct}%

### Notes
{any qualitative observations about this session's behavior}
```
