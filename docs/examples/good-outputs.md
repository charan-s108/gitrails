# Good Outputs — Calibration Examples

> Examples of high-quality gitrails output.
> Used for calibrating agent behavior and validating findings.

---

## Good: CRITICAL finding with proper redaction

```json
{
  "finding_id": "SEC-f3a9-001",
  "severity": "CRITICAL",
  "agent": "sentinel",
  "skill": "scan-secrets",
  "type": "hardcoded-api-key",
  "file": "src/auth/config.js",
  "line": 14,
  "pattern": "AWS access key (AKIA...)",
  "value": "[REDACTED]",
  "owasp": "A07",
  "recommendation": "Move to environment variable. Rotate this key immediately.",
  "token_savings_pct": 90.0
}
```

Why this is good:
- Secret value is redacted, not echoed
- Specific file AND line number
- OWASP category cited
- Actionable recommendation
- Token savings tracked

---

## Good: Risk score with transparent breakdown

```json
{
  "risk_score": 0.61,
  "components": {
    "security_severity": { "score": 1.00, "weight": 0.35, "weighted": 0.350 },
    "bug_probability":   { "score": 0.40, "weight": 0.25, "weighted": 0.100 },
    "complexity_delta":  { "score": 0.30, "weight": 0.20, "weighted": 0.060 },
    "test_coverage_gap": { "score": 0.80, "weight": 0.10, "weighted": 0.080 },
    "documentation_debt":{ "score": 0.20, "weight": 0.10, "weighted": 0.020 }
  },
  "verdict": "BLOCKED",
  "critical_override": true,
  "override_reason": "SEC-f3a9-001: CRITICAL hardcoded AWS key detected"
}
```

Why this is good:
- Full formula breakdown — auditable
- Critical override is explicit and reasoned
- Verdict is unambiguous

---

## Good: Suppression applied correctly

```
sentinel/scan-secrets:
  Checking src/test/fixtures/auth.mock.js against knowledge/false-positives.md...
  → Matches suppression: test-spec-files
  → Skipping (suppressed by default rule test-spec-files)
  → Logged: suppression_applied=true, finding_id=null
```

Why this is good:
- Suppression explicitly logged
- No false positive raised
- Audit trail preserved

---

## Good: mirror propose-learning PR

```markdown
PR title: mirror: suppress — __mocks__/ test fixture tokens

Evidence: SEC-f3a9-004 flagged __mocks__/auth.test.js:8 across 2 sessions,
no action taken by development team.

Proposed addition to knowledge/false-positives.md:
  ## test-mock-tokens
  - pattern: __mocks__/**
  - reason: Realistic test tokens are intentional in this codebase
  - added_by: mirror
  - session: f3a9b2c1
  - date: 2026-04-10

⚠️ This PR requires human approval. Mirror does not self-merge.
```

Why this is good:
- Evidence-based (multiple sessions, no action taken)
- Specific pattern, not vague suppression
- Requires human approval — not self-merged
- Reason is codebase-specific

---

## Good: Scribe documentation (accurate)

```javascript
/**
 * Validates a user by ID and returns the user record.
 *
 * Queries the database for the given userId. Returns null if the user does
 * not exist. Does NOT throw on missing users — check the return value.
 *
 * @param {string} userId - The user's unique identifier (UUID format)
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.includeProfile=false] - Include profile data
 * @returns {Promise<User|null>} The user record, or null if not found
 * @throws {ValidationError} If userId is null, undefined, or empty string
 */
```

Why this is good:
- Documents the null-return behavior explicitly (important edge case)
- Accurate @throws — ValidationError is in the code
- Doesn't claim "handles gracefully" — just describes behavior
- Based on code read, not guesswork
