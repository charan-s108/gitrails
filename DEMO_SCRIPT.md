# DEMO_SCRIPT.md — gitrails Recording Walkthrough

**Target length:** 4–6 minutes
**Recommended tool:** [Loom](https://loom.com) (free) or OBS Studio
**Resolution:** 1920×1080 — use a clean terminal theme (dark background)
**Font size:** 16px minimum so text is readable in the video

---

## Before You Record

### Terminal setup

```bash
# Recommended terminal profile for recording
# - Theme: Tokyo Night or Catppuccin Mocha (dark, high contrast)
# - Font: JetBrains Mono or Fira Code, 16px
# - Window: maximised or 1200×700 split with browser
export PS1="gitrails-demo $ "   # clean prompt — remove machine name/path noise
clear
```

### Split layout (recommended)

- **Left 60%** — terminal
- **Right 40%** — GitHub PR page in browser

### Environment check

```bash
cd ~/documents/gitrails
cat .env | grep -E "GOOGLE|GITHUB" | sed 's/=.*/=***/'   # confirm keys set, mask values
npm run validate      # confirm gitagent validate exits 0
npm run info          # confirm 4 agents + 12 skills listed
```

---

## Scene 1 — Introduction (0:00 – 0:40)

**Narrate while showing the repo root in the terminal:**

> "This is gitrails — a multi-agent AI system that lives inside a git repository.
> It reviews every pull request automatically — scanning for security vulnerabilities,
> code quality issues, missing tests, and documentation gaps.
>
> What makes it different: it uses a local vector index and code graph to read
> only the relevant 30 lines of a file instead of loading 500. That means 60 to 95
> percent fewer tokens per scan — which is the difference between running twice a day
> and running 20 times a day on the free tier.
>
> It also learns. After every session, the mirror agent reviews gitrails' own decisions
> and proposes what it should unlearn. You approve or reject. It never self-modifies."

**Show on screen:**

```bash
cat SOUL.md | head -20
```

---

## Scene 2 — The Vulnerable PR (0:40 – 1:20)

**Switch to browser — show a PR you've pre-created with these changes:**

Create this file in your test repo before recording:

```javascript
// src/auth/config.js  — this is the "bad" version for the demo
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";       // hardcoded key
const DB_PASS = "supersecret123";             // hardcoded password

function connectDB() {
    const query = "SELECT * FROM users WHERE id = " + userId;  // SQL injection
    return db.execute(query);
}

// No tests. No docstrings. Complexity score: 18.
```

**Narrate:**

> "Here's a PR that has three problems. A hardcoded AWS access key. A SQL injection
> vulnerability. And zero tests for a new authentication function.
>
> Without gitrails, this might slip through. With gitrails, it doesn't."

**Show the open PR in the browser — show the 'Checks' tab is pending.**

---

## Scene 3 — gitrails Triggers (1:20 – 2:00)

**Switch to terminal. Show the GitHub Actions log or run manually:**

```bash
# For the demo, trigger locally against the PR branch:
export PR_NUMBER=42

gitclaw --dir . \
  --repo https://github.com/charan-s108/your-test-repo \
  --prompt "Review PR #${PR_NUMBER}"
```

**Show bootstrap output:**

```
gitrails: loading memory...
gitrails: knowledge/patterns.md loaded
gitrails: knowledge/false-positives.md loaded
gitrails: vector index confirmed (2,847 chunks across 94 files)
gitrails: code graph loaded (94 files, 312 functions)
gitrails: bootstrap complete
```

**Narrate:**

> "gitrails bootstraps — loading learned team patterns, the vector index,
> and the code graph. All of that is local. No external API calls for retrieval."

---

## Scene 4 — Triage and Dispatch (2:00 – 2:40)

**Show the triage output in terminal:**

```
[triage] semantic-search: "hardcoded credentials authentication secret"
[triage] → src/auth/config.js  lines 1–3  score: 0.97
[triage] → src/auth/login.js   lines 44–52  score: 0.81
[triage] code graph hotspots: src/auth/login.js complexity: 18

[dispatch] sentinel  → security=CRITICAL  scope: src/auth/
[dispatch] reviewer  → quality=HIGH        scope: src/auth/, tests/
[dispatch] scribe    → docs=MEDIUM         scope: src/auth/
[dispatch] running in parallel...
```

**Narrate:**

> "The triage skill queries the vector index first — finding the credential file
> in 12 tokens instead of reading 3,000 tokens of source. Then it dispatches
> sentinel, reviewer, and scribe in parallel."

---

## Scene 5 — sentinel Fires (2:40 – 3:10)

**Show sentinel output:**

```
[sentinel/scan-secrets]
  semantic-search: "AWS access key AKIA secret token password"
  → src/auth/config.js  line 1  score: 0.99

  CRITICAL  SEC-001  Hardcoded AWS Access Key
  File: src/auth/config.js · Line: 1
  Pattern: AWS Access Key (AKIA...)
  Value: AKIA[REDACTED]
  Age: introduced 2 minutes ago
  Fix: Move to environment variable. Rotate key immediately.

  HIGH  SEC-002  SQL Injection (CWE-89)
  File: src/auth/config.js · Line: 6
  Pattern: String concatenation in SQL query
  Fix: Use parameterised query: db.execute("SELECT... WHERE id = ?", [userId])

[sentinel] 2 findings · 1 CRITICAL · 1 HIGH
[sentinel] token cost: 340 tokens (vs ~18,000 for full-file reads)
```

**Narrate:**

> "sentinel found the AWS key on line 1 in 340 tokens. Reading those two files
> in full would have cost 18,000 tokens. That's a 98 percent saving on this scan alone.
>
> Notice: the raw key value never appears anywhere. It's always redacted."

---

## Scene 6 — Risk Score and Block (3:10 – 3:40)

**Show reviewer output and final risk score:**

```
[reviewer/score-risk]
  security_severity:  1.0  (CRITICAL present)
  bug_probability:    0.4  (SQL injection pattern)
  complexity_delta:   0.3  (hotspot: login.js complexity 18, from graph)
  test_coverage_gap:  0.8  (0 tests added, 3 functions modified)
  documentation_debt: 0.2

  risk = (0.35×1.0) + (0.25×0.4) + (0.20×0.3) + (0.10×0.8) + (0.10×0.2)
       = 0.35 + 0.10 + 0.06 + 0.08 + 0.02
       = 0.61

  CRITICAL override → PR BLOCKED regardless of numeric score

[gitrails] PR #42 BLOCKED
[gitrails] label: gitrails/blocked
[gitrails] GitHub Check: FAIL
[gitrails] review comment posted
```

**Switch to browser — show the blocked PR with the structured review comment.**

**Narrate:**

> "Risk score 0.61 — but the CRITICAL finding overrides it. PR is blocked.
> The review comment on GitHub shows all findings, severity-bucketed, with
> exact file paths and fix recommendations."

---

## Scene 7 — Fix and Re-run (3:40 – 4:20)

**Show the fix being made (pre-prepare this branch before recording):**

```bash
# Show the fixed version
cat src/auth/config.js
```

```javascript
// src/auth/config.js  — fixed version
const AWS_KEY = process.env.AWS_ACCESS_KEY_ID;
const DB_PASS = process.env.DB_PASSWORD;

function connectDB() {
    const query = "SELECT * FROM users WHERE id = ?";
    return db.execute(query, [userId]);
}
```

```bash
# Show 3 tests added
ls -la tests/auth/
```

**Trigger re-run:**

```bash
gitclaw --dir . \
  --repo https://github.com/charan-s108/your-test-repo \
  --prompt "Re-review PR #${PR_NUMBER}"
```

**Show the new output:**

```
[sentinel] 0 findings
[reviewer] risk = 0.09 — PASS
[gitrails] PR #42 APPROVED
[gitrails] label: gitrails/approved
[gitrails] GitHub Check: PASS
```

**Switch to browser — show the green check.**

---

## Scene 8 — mirror Learns (4:20 – 5:00)

**Show teardown and mirror output:**

```
[teardown] session complete · proposing learnings...

[mirror/audit-decisions]
  Reviewing session SEC-001, SEC-002...
  SEC-001 correctly flagged — no false positive
  SEC-002 correctly flagged — no false positive

[mirror/propose-learning]
  Observed: team uses __mocks__/ directory with realistic-looking fake tokens
  Action: opening PR to knowledge/false-positives.md

  PR #43 opened: "learning: suppress __mocks__/ from credential scans"
  Body: "Stop flagging __mocks__/ test fixtures — this team uses
         realistic fake tokens there by convention. 4 sessions have
         dismissed this finding."
```

**Switch to browser — show mirror's open PR to `knowledge/`.**

**Narrate:**

> "mirror opened a PR to knowledge/false-positives.md. If I merge it, gitrails
> will never flag __mocks__/ again. If I close it, gitrails keeps flagging it.
>
> gitrails doesn't self-modify. It proposes. You decide.
> That's the difference between a tool and a teammate."

---

## Scene 9 — Close (5:00 – 5:20)

**Show the repo structure briefly:**

```bash
npm run info
```

```
gitrails v1.0.0
  4 agents · 12 skills · gitclaw runtime
  model: google:gemini-2.5-flash (free tier · $0)
  compliance: risk_tier=high · human_in_the_loop=conditional · kill_switch=true
  SOD: analyzer/auditor conflict enforced
```

**Narrate:**

> "gitrails. A multi-agent engineering teammate — built on the gitagent standard,
> run with gitclaw, powered by Gemini Flash at zero cost.
>
> It reads precisely. It learns carefully. It never acts without you."

---

## Post-Recording

1. Trim any pauses longer than 2 seconds
2. Add captions for the narration (Loom does this automatically)
3. Export at 1080p
4. Upload to YouTube as unlisted or Loom as public link
5. Copy the embed URL into README.md — replace the demo placeholder block

**README embed format:**

```markdown
[![gitrails demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://youtu.be/YOUR_VIDEO_ID)
```

---

*Total estimated recording time: 5–6 minutes including setup and retakes.*
*Recommended: record in one take. Authentic is better than polished for hackathons.*
