---
name: synthesize
description: "Merges findings from sentinel, reviewer, and scribe into a structured PR comment, sets GitHub Check status, applies PR labels, and triggers mirror for post-session audit."
license: MIT
allowed-tools: Read Write pr-comment audit-log git-write
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# synthesize

## Purpose

After all agents complete, synthesize merges their outputs into a single
structured PR comment, sets the GitHub Check status, and applies the
appropriate PR label. It is the final step before mirror runs.

## Token Budget

synthesize performs zero file reads. All inputs come from agent completion
signals. Token usage is minimal — only PR comment posting.

## Instructions

1. Collect outputs from dispatch:
   - sentinel findings list + CRITICAL override flag
   - reviewer risk_score + verdict + finding list
   - scribe changelog entry + documented functions
2. Apply CRITICAL override logic:
   - If ANY CRITICAL finding from sentinel → verdict = BLOCKED (ignore risk score)
3. Compose PR comment (format below)
4. Post PR comment via pr-comment tool
5. Set GitHub Check status via pr-comment tool: PASS or FAIL
6. Apply PR label via pr-comment tool: gitrails/approved, gitrails/needs-review, or gitrails/blocked
7. Log final session summary to `memory/runtime/dailylog.md`
8. Log to audit-log
9. Signal gitrails orchestrator: synthesize complete → trigger mirror

## PR Comment Format

```markdown
## gitrails Review — PR #42

**Risk Score**: 🔴 0.61 — BLOCKED
**Session**: `gitrails/session-f3a9b2c1`

---

### Security Findings (sentinel)

| ID | Severity | Type | File | Line | OWASP |
|----|----------|------|------|------|-------|
| SEC-f3a9-001 | 🔴 CRITICAL | hardcoded-api-key | src/auth/config.js | 14 | A07 |

> ⚠️ SEC-f3a9-001: AWS access key detected at `src/auth/config.js:14`.
> Value: `[REDACTED]`. Move to `.env` and rotate this key immediately.

---

### Code Review Findings (reviewer)

| ID | Severity | Type | File | Line |
|----|----------|------|------|------|
| REV-f3a9-001 | 🟡 MEDIUM | null-dereference | src/auth/login.js | 34 |
| REV-f3a9-002 | 🟡 MEDIUM | test-coverage-gap | src/auth/login.js | — |

**Risk Breakdown**:
- Security severity: 1.00 × 0.35 = 0.350
- Bug probability: 0.40 × 0.25 = 0.100
- Complexity delta: 0.30 × 0.20 = 0.060
- Test coverage gap: 0.80 × 0.10 = 0.080
- Documentation debt: 0.20 × 0.10 = 0.020
- **Total: 0.61**

---

### Documentation (scribe)

✅ CHANGELOG.md updated with security fix entry.

---

### Verdict

🔴 **BLOCKED** — CRITICAL security finding present.

Fix SEC-f3a9-001 before this PR can proceed.

---
*gitrails v1.0.0 · gitagent spec v0.1.0 · groq (model via GITRAILS_MODEL)*
```

## Output Format

```json
{
  "skill": "synthesize",
  "verdict": "BLOCKED",
  "risk_score": 0.61,
  "github_check": "FAIL",
  "pr_label": "gitrails/blocked",
  "pr_comment_posted": true,
  "mirror_triggered": true
}
```
