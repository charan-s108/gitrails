---
name: contradiction-check
description: "Detects rule drift and inconsistent application of detection patterns across the current session. Reports contradictions to dailylog.md without modifying any rules."
license: MIT
allowed-tools: Read Write audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "low"
---

# contradiction-check

## Purpose

Detects when gitrails applied a rule inconsistently — flagging a pattern in
one file but missing it in another with identical structure. Also detects
when the same rule was applied differently across sessions (rule drift).

Reports contradictions to `memory/runtime/dailylog.md` only.
Does NOT modify rules, does NOT open PRs. Reporting is the output.

## Token Budget

contradiction-check reads only session logs and pattern files.

Step 1 — Read session findings:
  Read memory/runtime/dailylog.md (full, to get all finding details)
  → findings with file, pattern, severity

Step 2 — Read active patterns:
  Read knowledge/patterns.md
  → expected scope for each rule

Step 3 — Compare:
  Group findings by pattern type
  Check: did the same pattern appear in multiple files but only get flagged once?
  Check: does the pattern's expected scope in patterns.md match where it fired?

Rule: Maximum 3 file reads. No source code reads.
Contradiction-check analyzes gitrails' behavior, not code.

## Instructions

1. Read `memory/runtime/dailylog.md` — extract all findings with file/pattern/severity
2. Read `knowledge/patterns.md` — load expected scope for each active rule
3. Group findings by pattern type (e.g., all `hardcoded-api-key` findings together)
4. For each pattern group:
   a. Check if the same pattern should have fired in other files (per patterns.md scope)
   b. If scope says `auth/**` but finding only in `auth/login.js` not `auth/register.js` → contradiction
   c. If a finding's severity differs from the pattern's declared severity → contradiction
5. Check for rule drift:
   a. If a pattern was applied at severity HIGH last session but LOW this session → flag
   b. (Read memory/runtime/key-decisions.md for prior session context if available)
6. Append contradiction report to `memory/runtime/dailylog.md`

## Output Format

Appended to `memory/runtime/dailylog.md`:

```markdown
## contradiction-check — {timestamp}

### Contradictions Detected

#### Inconsistent Scope
- Pattern: `hardcoded-api-key`
  Expected scope: `src/**` (per patterns.md rule 7)
  Fired in: `src/auth/config.js`
  Missed in: `src/payments/gateway.js` (same pattern present)
  Recommendation: Extend scan scope or verify payments/ was not in diff

#### Severity Drift
- Pattern: `missing-null-check`
  This session severity: LOW
  Previous session severity: MEDIUM (per key-decisions.md)
  Recommendation: Verify severity calibration for this pattern

### No Contradictions
{list patterns that were applied consistently}

### Drift Assessment
Behavioral drift detected: {YES|NO}
Severity: {NONE|MINOR|SIGNIFICANT}
Action required: {none|mirror to propose clarification PR|escalate to human}
```
