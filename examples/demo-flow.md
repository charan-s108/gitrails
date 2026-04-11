# Demo Flow — gitrails

> Full walkthrough of a gitrails PR review session.
> Shows token-efficient retrieval and human-gated learning in action.

---

## Setup

```bash
git clone <this-repo>
npm install
cp .env.example .env
# Add GROQ_API_KEY from https://console.groq.com (free, no credit card)
# Add GITHUB_TOKEN with repo + pull_requests scopes
npm run index:build   # ~60s first time, downloads ~80MB embedding model
npm run graph:build   # builds code graph
npm run validate      # must exit 0
```

---

## Step 1: Developer opens PR #42

```
PR #42: auth module — hardcoded AWS key + 0 tests
Branch: fix/auth-module
Changed files:
  - src/auth/config.js   (+15 lines)
  - src/auth/login.js    (+42 lines)
```

---

## Step 2: gitrails-pr.yml triggers

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

GitHub Actions starts the job. gitrails:
- Creates session branch: `gitrails/session-f3a9b2c1`
- Sets `GITRAILS_SESSION_ID=f3a9b2c1`
- Runs `bootstrap.sh`

```
gitrails: loading memory...
gitrails: checking vector index... [OK — exists]
gitrails: checking code graph... [OK — exists]
gitrails: bootstrap complete
{ "action": "allow" }
```

---

## Step 3: triage skill

Semantic search queries run against the vector index:

```
Query: "hardcoded credentials authentication"
→ [{ file: "src/auth/config.js", start_line: "12", end_line: "18", score: 0.97 }]

Query: "complexity high risk function critical path"
→ [{ file: "src/auth/login.js", start_line: "1", end_line: "42", score: 0.84 }]
```

Code graph query (zero file reads):
```javascript
graph.getHotspots()
→ [{ file: "src/auth/login.js", complexity: "18" }]
```

Dispatch plan:
```json
{
  "sentinel": { "priority": "CRITICAL", "scope": ["src/auth/config.js", "src/auth/login.js"] },
  "reviewer": { "priority": "HIGH", "scope": ["src/auth/login.js"], "hotspots": ["login.js (18)"] },
  "scribe":   { "priority": "LOW",  "scope": ["src/auth/login.js"] }
}
```

**API calls so far: 2** (2 semantic-search queries + 0 file reads)

---

## Step 4: sentinel, reviewer, scribe dispatched in parallel

All three agents start simultaneously.

---

## Step 5: sentinel/scan-secrets

```
Query: "AWS AKIA access key secret environment variable"
→ [{ file: "src/auth/config.js", start_line: "14", end_line: "14", score: 0.99 }]
```

`pre-tool-audit.sh` logs the git-read call.

```
git-read src/auth/config.js lines 14-14
→ 1 line read: const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
→ 12 tokens used
```

**Token comparison:**
- Full file read: 15 lines × ~8 tokens = ~120 tokens
- gitrails approach: 1 line = 12 tokens
- **Token saving: 90%**

Finding raised:
```json
{
  "finding_id": "SEC-f3a9-001",
  "severity": "CRITICAL",
  "type": "hardcoded-api-key",
  "file": "src/auth/config.js",
  "line": 14,
  "pattern": "AWS access key (AKIA...)",
  "value": "[REDACTED]",
  "owasp": "A07",
  "recommendation": "Move to environment variable. Rotate this key immediately."
}
```

`post-response-check.sh` verifies no raw secret in output. ✅

---

## Step 6: reviewer/score-risk

Complexity check (zero file reads):
```javascript
graph.getHotspots()
→ [{ file: "src/auth/login.js", complexity: "18" }]
```

Semantic search for bugs:
```
Query: "null check error handling missing"
→ [{ file: "src/auth/login.js", start_line: "31", end_line: "35", score: 0.88 }]
```

```
git-read src/auth/login.js lines 31-35
→ 5 lines: user.profile.name accessed, no null check on user or profile
→ ~40 tokens
```

Risk formula computed:
```
security_severity = 1.00 (CRITICAL finding from sentinel)
bug_probability   = 0.40 (1 medium null-dereference finding)
complexity_delta  = 0.30 (login.js already hotspot at 18, minor addition)
test_coverage_gap = 0.80 (validateUser() has zero tests)
documentation_debt= 0.20 (one undocumented function)

risk = (0.35 × 1.00) + (0.25 × 0.40) + (0.20 × 0.30) + (0.10 × 0.80) + (0.10 × 0.20)
     = 0.350 + 0.100 + 0.060 + 0.080 + 0.020
     = 0.61

CRITICAL override: SEC-f3a9-001 present → verdict = BLOCKED
```

---

## Step 7: synthesize posts PR comment

PR comment posted to #42:

```markdown
## gitrails Review — PR #42

**Risk Score**: 🔴 0.61 — BLOCKED
**Session**: `gitrails/session-f3a9b2c1`

### Security Findings (sentinel)

| ID | Severity | Type | File | Line | OWASP |
|SEC-f3a9-001 | 🔴 CRITICAL | hardcoded-api-key | src/auth/config.js | 14 | A07 |

> ⚠️ AWS access key detected. Value: [REDACTED]. Move to .env and rotate immediately.

### Code Review Findings (reviewer)

| ID | Severity | Type | File | Line |
|REV-f3a9-001 | 🟡 MEDIUM | null-dereference | src/auth/login.js | 34 |
|REV-f3a9-002 | 🟡 MEDIUM | test-coverage-gap | src/auth/login.js | — |

**Risk**: 0.61 (blocked by CRITICAL override)

### Verdict: 🔴 BLOCKED

Fix SEC-f3a9-001 before this PR can proceed.
```

GitHub Check: **FAIL** ❌
PR Label: `gitrails/blocked`

**Total API calls: 8**
**Total tokens: ~350 (vs ~12,000 without retrieval)**
**Token saving: ~97%**

---

## Step 8: Developer fixes the issues

Developer:
1. Moves AWS key to `.env`, references via `process.env.AWS_KEY`
2. Adds 3 tests for `validateUser()`
3. Fixes null check: `if (!user || !user.profile) return null`
4. Force-pushes fix

gitrails re-runs (PR synchronize trigger).

New session: `gitrails/session-d8e1f4a2`

New scan results:
- sentinel: no secrets found ✅
- reviewer: no null dereference ✅, test gap reduced
- New risk score: 0.09 (LOW)
- Verdict: APPROVED

GitHub Check: **PASS** ✅
PR Label: `gitrails/approved`

---

## Step 9: mirror/propose-learning fires (post-session)

mirror reads `memory/runtime/dailylog.md` from both sessions.

mirror notices: in session 1, gitrails flagged test credentials in
`__mocks__/auth.test.js` (score 0.71, but no action was taken).

mirror opens PR:

```
PR title: mirror: suppress — __mocks__/ test fixture tokens

Evidence:
  Session f3a9b2c1: SEC-f3a9-004 flagged __mocks__/auth.test.js:8
  Action taken: none (developer ignored finding)

Proposed change to knowledge/false-positives.md:
  ## test-mock-tokens
  - pattern: __mocks__/**
  - reason: This team uses realistic-looking fake tokens in mock files by convention
  - added_by: mirror
  - session: f3a9b2c1
```

Developer reviews the PR, agrees, merges it.

Next PR: gitrails skips `__mocks__/` for credential scans. ✅

---

## Token Efficiency Summary

| Approach | Tokens per scan | Sessions/day (free tier) |
|----------|-----------------|--------------------------|
| Full-file reads | ~12,000 | ~2 |
| gitrails retrieval | ~350 | ~71 |
| **Improvement** | **97% fewer tokens** | **35× more sessions** |
