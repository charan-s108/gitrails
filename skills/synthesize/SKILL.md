---
name: synthesize
description: "Merges findings from sentinel, reviewer, and scribe into a structured PR comment, sets GitHub Check status, applies PR labels, and triggers mirror for post-session audit."
license: MIT
allowed-tools: read audit-log pr-comment git-write
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Synthesize

## Purpose

Synthesize is the final orchestration step. It takes all sub-agent outputs,
computes the definitive verdict, posts a single structured PR comment, applies
the correct label, and then hands off to mirror for the post-session audit.
No sub-agent posts its own PR comment — that is synthesize's job exclusively.

## Instructions

1. Collect inputs from dispatch:
   - `sentinel_findings`: list of `{ finding_id, severity, owasp, file, line, description }`
   - `reviewer_output`: `{ risk_score, verdict, findings, test_gaps }`
   - `scribe_output`: `{ changelog_entry, documented_functions }` (may be null if skipped)

2. Compute final verdict:
   - If any `sentinel_findings` has `severity: CRITICAL` → `verdict: BLOCKED`
   - Else if `reviewer_output.risk_score > 0.7` → `verdict: BLOCKED`
   - Else if `reviewer_output.risk_score >= 0.3` → `verdict: NEEDS_REVIEW`
   - Else → `verdict: APPROVED`

3. Build the PR comment body using this exact structure:
   ```
   ## gitrails Review

   **Verdict**: APPROVED | NEEDS_REVIEW | BLOCKED
   **Risk Score**: 0.XX / 1.0

   ### Security Findings (sentinel)
   | ID | Severity | OWASP | File | Line | Description |
   |----|----------|-------|------|------|-------------|
   | SEC-001 | CRITICAL | A07 | src/auth.js | 14 | [REDACTED] hardcoded key |

   ### Code Quality (reviewer)
   | ID | Severity | File | Line | Issue |
   |----|----------|------|------|-------|

   ### Test Coverage Gaps
   - function `validateToken` — no test file found

   ### Documentation
   - Updated: src/auth/config.js (JSDoc added)
   - Changelog: CHANGELOG.md prepended
   ```

4. Post the comment via the `pr-comment` tool.

5. Apply the appropriate PR label:
   - `BLOCKED` → `gitrails/blocked`
   - `NEEDS_REVIEW` → `gitrails/review`
   - `APPROVED` → `gitrails/approved`

6. Set GitHub Check status to match the verdict (pass/fail).

7. Append a session summary to `memory/runtime/dailylog.md`:
   ```
   ## Session {timestamp}
   PR: #{number}
   Verdict: {verdict}
   Risk Score: {score}
   Sentinel findings: {count} ({critical} CRITICAL)
   Reviewer findings: {count}
   Scribe: {documented_count} functions documented
   ```

8. Trigger the **mirror** agent for the post-session audit. Pass the full
   session summary including all findings.

## Token Budget

Read no source files in this skill. All data comes from prior skill outputs.
Synthesize uses zero `semantic-search` calls — it only formats and posts.
