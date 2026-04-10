# Bad Outputs — Anti-Patterns to Avoid

> Examples of outputs gitrails must NEVER produce.
> Used for calibration and testing against regressions.

---

## BAD: Secret value echoed in output

```
❌ NEVER DO THIS:
Finding: Hardcoded AWS key detected at src/auth/config.js:14
Value: AKIAIOSFODNN7EXAMPLEKEY123456
```

Why this is bad:
- Echoes the secret in PR comments, logs, and audit trail
- Credential now in GitHub comment history
- Violates RULES.md rule 10

Correct version: value should be `[REDACTED]`

---

## BAD: Finding without line number

```
❌ NEVER DO THIS:
{
  "finding_id": "SEC-001",
  "severity": "HIGH",
  "file": "src/auth/",
  "description": "Possible injection vulnerability in auth module"
}
```

Why this is bad:
- No line number → developer doesn't know where to look
- Directory-level file path → too vague to act on
- Vague description → "possible" is not actionable
- Violates RULES.md rule 11

---

## BAD: Risk score without breakdown

```
❌ NEVER DO THIS:
{ "risk_score": 0.61, "verdict": "BLOCKED" }
```

Why this is bad:
- Opaque — no transparency into how the score was derived
- Not auditable
- Developer can't improve their PR if they don't know which component is high

---

## BAD: mirror updating knowledge/ directly

```
❌ NEVER DO THIS:
mirror writing to knowledge/false-positives.md:
  echo "## suppress-all-tests\n- pattern: **/*.test.*" >> knowledge/false-positives.md
  git commit -m "mirror: suppress test file findings"
```

Why this is bad:
- mirror bypassed human review
- No PR, no audit trail
- Violates mirror RULES.md rule 1 and DUTIES.md
- mirror must ONLY propose via PR — never commit directly

---

## BAD: Documenting behavior not in code

```javascript
❌ NEVER DO THIS (from scribe):
/**
 * Validates a user by ID and returns the user record.
 * Handles null input gracefully by returning a default user object.
 * Automatically retries on database timeout.
 * @returns {User} Always returns a valid user — never null
 */
```

Why this is bad:
- "Handles null gracefully" — the code actually throws ValidationError
- "Automatically retries" — no retry logic exists in this function
- "Never null" — the function returns null for unknown users
- Scribe invented behavior. A developer will trust this doc and get a bug.

---

## BAD: Flagging false positives that should be suppressed

```
❌ AVOID THIS after .env.example is in false-positives.md:
sentinel/scan-secrets:
  CRITICAL: Hardcoded key pattern in .env.example:1
  Value: [REDACTED — placeholder text "your-google-ai-studio-key-here"]
```

Why this is bad:
- .env.example is explicitly suppressed in knowledge/false-positives.md
- Placeholder text is not a real credential
- This is pure noise that erodes trust in sentinel
- mirror should catch this and propose a suppression if not already suppressed

---

## BAD: Reading entire files

```
❌ NEVER DO THIS:
git-read src/auth/login.js
→ 500 lines read
→ ~4,000 tokens consumed
→ Free tier exhausted after 2-3 PRs
```

Why this is bad:
- Semantic-search returns exact line ranges — use them
- Full-file reads consume 60-95% more tokens for the same finding
- On Gemini Flash free tier (250 RPD), full reads exhaust the quota in ~2 sessions

---

## BAD: Silent failure

```
❌ NEVER DO THIS:
sentinel/scan-vulnerabilities timed out after 120s
→ [no output, no PR comment, no audit log entry]
→ PR proceeds as if no scan occurred
```

Why this is bad:
- Developer has no idea the scan didn't run
- Security check silently bypassed
- Violates RULES.md rule 28 ("no silent failures ever")
- Correct behavior: teardown.sh fires, draft PR opened with partial findings
