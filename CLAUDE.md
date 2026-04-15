# CLAUDE.md — gitrails

> Read this entire file before writing a single line of code.
> This is the authoritative, battle-tested spec for building gitrails correctly.
> Built for: GitAgent Hackathon 2026 — HackCulture x Lyzr

---

## Branch Strategy

Two branches only:

| Branch | Purpose |
|--------|---------|
| `main` | Production — this is what judges see, what Actions runs on |
| `test/gitrails-production-verify` | Workflow testing — push demo vulns here, open PRs against main to trigger Actions |

Never create feature branches, session branches, or release branches in this repo. The gitrails agents themselves operate on a temporary `gitrails/session-{uuid}` branch when doing their own commits — that is internal and cleaned up after each run.

---

## How the Workflow Works (Plain English)

1. **You push a commit** to `test/gitrails-production-verify` and open a PR targeting `main`.
2. **GitHub Actions fires** — `.github/workflows/gitrails-pr.yml` triggers on `pull_request`.
3. **gitclaw starts** — it reads `agent.yaml` in the repo root, loads gitrails' `SOUL.md` + `RULES.md` + 5 root skills into Groq's context (~660 tokens total).
4. **`review-pr` runs** — gitrails calls `git diff` via `cli`, reads the changed files, spots anything obvious.
5. **`run-sentinel` fires** — gitclaw opens a **fresh invocation** loading only sentinel's context (SOUL.md + RULES.md + 3 domain skills). Sentinel checks OWASP A01-A09, returns findings. Fresh context = no overload.
6. **`run-reviewer` fires** — same pattern: fresh invocation, reviewer computes weighted risk score (formula: 0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs).
7. **`run-scribe` fires** — only if not BLOCKED. Generates changelog entry + JSDoc for changed functions.
8. **`run-mirror` fires** — always last. Audits this session's accuracy. May draft a PR to `knowledge/false-positives.md`. Never self-merges.
9. **Verdict posted** — BLOCKED / NEEDS_REVIEW / APPROVED — written back as a PR comment.

Each agent runs in isolation. Groq never sees more than one agent's context at a time.

---

## What gitrails Is

A multi-agent AI code review system built on the **gitagent spec v0.1.0**, runtime is **gitclaw**.

- **sentinel** — scans PRs for OWASP Top 10 vulnerabilities and hardcoded secrets
- **reviewer** — scores code quality risk, checks test coverage, flags bugs
- **scribe** — generates changelog entries and JSDoc for changed functions
- **mirror** — runs after every session, audits gitrails' own decisions, proposes learning via human-approved PRs

**Key differentiator**: mirror is gitrails' conscience. It never self-modifies — it proposes PRs to `knowledge/`, humans approve them. This is how gitrails earns trust over time.

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Agent runtime | gitclaw | The spec runtime — `npm install -g gitclaw` |
| Model (primary) | groq:llama-3.1-8b-instant | Fast, handles 95% of cases on free tier |
| Model (fallback) | groq:llama-3.3-70b-versatile | Larger context when primary fails |
| Language | Node.js 18+ ESM | gitclaw requires it |
| Secrets | `.env` only | Never hardcoded |

---

## Architecture — How Sub-Agents Are Called Independently

This is the single most important architectural decision. Get this wrong and everything fails.

### The Problem with `delegation: mode: auto`

`delegation: mode: auto` tells gitclaw to load ALL sub-agent contexts (SOUL.md + RULES.md + all their skills) into the root agent's context simultaneously. With 4 sub-agents, that is 2,000+ tokens before the user sends a single message. Groq's function calling fails with:

```
API error: Failed to call a function. Please adjust your prompt.
```

**Do not use `delegation: mode: auto`.** Remove it entirely from root `agent.yaml`.

### The Correct Pattern (from working production builds)

The root agent routes to sub-agents via explicit **`run-*` skills** — brief skill descriptors (30-50 tokens each) that tell gitclaw when and how to invoke each sub-agent. Sub-agent full context only loads when that specific agent is actually called.

```
Root agent context when running:
  SOUL.md          ~80 tokens
  RULES.md         ~100 tokens
  review-pr        ~120 tokens  ← entry point
  run-sentinel     ~40 tokens   ← brief: "invoke sentinel for security"
  run-reviewer     ~40 tokens
  run-scribe       ~40 tokens
  run-mirror       ~40 tokens
  tool schemas     ~200 tokens
  ─────────────────────────────
  Total:           ~660 tokens  ✓ well under Groq's reliable function-call limit
```

When gitclaw routes to sentinel, it opens a **fresh invocation** with only sentinel's context:
```
  sentinel/SOUL.md + RULES.md + domain skills  ~400 tokens
```

Each agent runs clean. No context pollution.

### Root agent.yaml — NO delegation block

```yaml
skills:
  - review-pr
  - run-sentinel
  - run-reviewer
  - run-scribe
  - run-mirror
# NO delegation block at all
```

### Sub-agents follow the strict spec layout

Each sub-agent has `agent.yaml`, `SOUL.md`, `RULES.md`, and a `skills/` directory. **No `SKILL.md` at the agent root** — the spec does not allow it there. No `DUTIES.md` — competitors don't use it.

```
agents/
├── sentinel/
│   ├── agent.yaml
│   ├── SOUL.md
│   ├── RULES.md
│   │   └── skills/           ← sentinel's own domain skills
│       ├── scan-secrets/SKILL.md
│       ├── scan-vulnerabilities/SKILL.md
│       └── scan-dependencies/SKILL.md
```

The root `run-*` skills (in `skills/run-sentinel/SKILL.md` etc.) are how the orchestrator knows when and how to invoke each sub-agent. That is sufficient — no separate invocation descriptor file needed at the agent root.

---

## Critical Lessons (Read Before Building)

### 1. gitclaw tool names are lowercase built-ins only

gitclaw exposes: `cli`, `read`, `write`, `memory`

```yaml
allowed-tools: read cli      # CORRECT
allowed-tools: Read Bash git-read audit-log   # WRONG — "Failed to call a function"
```

`tools/*.yaml` files are MCP schema documentation for judging. They are NOT callable at runtime.

### 2. Root system prompt must stay under ~700 tokens total

`SOUL.md + RULES.md + all root skills` compiled together = system prompt sent to Groq. Exceed ~700 tokens and function calling breaks.

| File | Max tokens |
|------|-----------|
| Root SOUL.md | 80 |
| Root RULES.md | 100 |
| review-pr/SKILL.md | 120 |
| Each run-*/SKILL.md | 40 |
| (4 × 40 = 160 total) | 160 |

Sub-agent SOUL.md files can be rich narratives — they load in fresh, separate invocations.

### 3. `version` must be a quoted string

```yaml
version: "1.0.0"   # CORRECT — validator passes
version: 1.0.0     # WRONG
```

### 4. No bypass scripts, ever

No `scripts/pr-scan.js`, `scripts/demo-scan.js`. No direct Groq API calls outside gitclaw. No `workflows/pr-review.yaml`.

### 5. Skill directories contain ONLY `SKILL.md`

If gitclaw scaffolding creates `agent.yaml`, `SOUL.md`, or `memory/` inside a skill directory — delete them immediately.

### 6. GitHub Actions needs `GROQ_API_KEY` as a repo secret

`Settings → Secrets and variables → Actions → New repository secret → GROQ_API_KEY`

---

## Exact Directory Structure

```
gitrails/
├── agent.yaml
├── SOUL.md
├── RULES.md
├── AGENTS.md
├── README.md
├── CONTRIBUTING.md
│
├── agents/
│   ├── sentinel/
│   │   ├── agent.yaml
│   │   ├── SOUL.md               ← rich narrative, loaded only when sentinel runs
│   │   ├── RULES.md
│   │   └── skills/
│   │       ├── scan-secrets/SKILL.md
│   │       ├── scan-vulnerabilities/SKILL.md
│   │       └── scan-dependencies/SKILL.md
│   ├── reviewer/
│   │   ├── agent.yaml
│   │   ├── SOUL.md
│   │   ├── RULES.md
│   │   └── skills/
│   │       ├── review-diff/SKILL.md
│   │       ├── score-risk/SKILL.md
│   │       └── suggest-tests/SKILL.md
│   ├── scribe/
│   │   ├── agent.yaml
│   │   ├── SOUL.md
│   │   ├── RULES.md
│   │   └── skills/
│   │       ├── generate-changelog/SKILL.md
│   │       └── document-module/SKILL.md
│   └── mirror/
│       ├── agent.yaml
│       ├── SOUL.md
│       ├── RULES.md
│       └── skills/
│           ├── audit-decisions/SKILL.md
│           ├── propose-learning/SKILL.md
│           └── contradiction-check/SKILL.md
│
├── skills/
│   ├── review-pr/SKILL.md        ← entry point skill
│   ├── run-sentinel/SKILL.md     ← "invoke sentinel for security scan"
│   ├── run-reviewer/SKILL.md     ← "invoke reviewer for risk scoring"
│   ├── run-scribe/SKILL.md       ← "invoke scribe for docs"
│   └── run-mirror/SKILL.md       ← "invoke mirror for post-session audit"
│
├── tools/                         ← MCP schema docs (not runtime tools)
│   ├── git-read.yaml
│   ├── git-write.yaml
│   ├── pr-comment.yaml
│   ├── audit-log.yaml
│   └── semantic-search.yaml
│
├── hooks/
│   ├── hooks.yaml
│   └── scripts/
│       ├── bootstrap.sh
│       ├── pre-tool-audit.sh
│       ├── post-response-check.sh
│       └── teardown.sh
│
├── memory/
│   ├── memory.yaml
│   ├── MEMORY.md
│   └── runtime/
│       ├── context.md
│       ├── dailylog.md
│       └── key-decisions.md
│
├── knowledge/
│   ├── index.yaml
│   ├── graph.json
│   ├── patterns.md
│   ├── team-preferences.md
│   ├── false-positives.md
│   └── codebase-map.md
│
├── compliance/
│   ├── audit.yaml
│   └── sod-policy.md
│
├── config/
│   ├── default.yaml
│   └── production.yaml
│
├── examples/
│   ├── demo-flow.md
│   ├── good-outputs.md
│   └── bad-outputs.md
│
├── .github/
│   └── workflows/
│       ├── gitrails-pr.yml
│       ├── gitrails-validate.yml
│       └── gitrails-weekly.yml
│
├── .gitclaw/
│   └── config.yaml
│
├── .gitagent/
│   └── .gitkeep
│
├── .gitignore
├── .env
├── .env.example
└── package.json
```

**Do NOT create:** `workflows/pr-review.yaml`, `scripts/pr-scan.js`, `scripts/demo-scan.js`, `bin/`, `retrieval/`

---

## All File Contents

### agent.yaml (root)

```yaml
spec_version: "0.1.0"
name: gitrails
version: "1.0.0"
description: "Self-aware, learning engineering teammate — reviews PRs, scans security, generates docs, and grows smarter through human-approved memory."
author: gitrails-team
license: MIT

model:
  preferred: "${GITRAILS_MODEL}"
  fallback:
    - "${GITRAILS_FALLBACK_MODEL}"
  constraints:
    temperature: 0.2
    max_tokens: 8192

tools:
  - git-read
  - git-write
  - pr-comment
  - audit-log
  - semantic-search

runtime:
  max_turns: 50
  timeout: 120

skills:
  - review-pr
  - run-sentinel
  - run-reviewer
  - run-scribe
  - run-mirror

compliance:
  risk_tier: high
  supervision:
    human_in_the_loop: conditional
    escalation_triggers:
      - confidence_below: 0.7
      - action_type: git_commit
      - action_type: pr_creation
      - error_detected: true
    override_capability: true
    kill_switch: true
  recordkeeping:
    audit_logging: true
    log_format: structured_json
    retention_period: "90d"
    log_contents:
      - prompts_and_responses
      - tool_calls
      - decision_pathways
      - model_version
      - timestamps
    immutable: true
  data_governance:
    pii_handling: redact
    data_classification: confidential
  segregation_of_duties:
    roles:
      - id: analyzer
        description: "Reads code and produces findings"
        permissions: [review, execute]
      - id: writer
        description: "Writes files and commits changes"
        permissions: [create, submit]
      - id: auditor
        description: "Reviews decisions and proposes memory updates"
        permissions: [audit, report]
      - id: approver
        description: "Human role — approves memory PRs and merge decisions"
        permissions: [approve, reject]
    conflicts:
      - [analyzer, auditor]
      - [writer, auditor]
    assignments:
      sentinel: [analyzer]
      reviewer: [analyzer]
      scribe: [writer]
      mirror: [auditor]
    isolation:
      state: full
      credentials: separate
    handoffs:
      - action: memory_update
        required_roles: [auditor, approver]
        approval_required: true
      - action: pr_merge
        required_roles: [analyzer, approver]
        approval_required: true
    enforcement: strict

tags:
  - hackathon
  - code-review
  - security
  - multi-agent
  - self-learning
  - gitagent-2026
```

---

### SOUL.md (root — max 80 tokens)

```markdown
# Soul — gitrails

I am gitrails — your team's engineering conscience. I review every PR before it merges: scanning for OWASP vulnerabilities, scoring code quality risk, generating documentation, and auditing my own decisions through mirror.

I route. sentinel finds secrets. reviewer scores risk. scribe documents changes. mirror checks whether I got it right — and proposes corrections only through human-approved PRs. I never merge code. I get smarter every session — but only with your permission.
```

---

### RULES.md (root — max 100 tokens)

```markdown
# Rules — gitrails

- NEVER write to: `main`, `master`, `develop`, `release/*`, `hotfix/*`
- Raw secrets MUST be redacted as `[REDACTED]` in all output
- `knowledge/*.md` updated ONLY via human-approved mirror PRs — never directly
- ANY CRITICAL finding → immediate PR block regardless of risk score
- Risk < 0.3 → approved · 0.3–0.7 → needs-review · > 0.7 → blocked
- on_error hook MUST fire on crash — no silent failures ever
```

---

### skills/review-pr/SKILL.md (max 120 tokens)

```markdown
---
name: review-pr
description: "Entry point — runs git diff and scans for secrets, OWASP issues, and code quality problems."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Review PR

1. Run `git diff HEAD~1 2>/dev/null || git show HEAD` via `cli`.
2. Scan diff for: secrets (OWASP A07), injection (A03), access control (A01), misconfiguration (A05), bugs.
3. Redact any credential values as `[REDACTED]`.
4. Invoke `run-sentinel` for deep security analysis.
5. Invoke `run-reviewer` for risk scoring.
6. If not BLOCKED: invoke `run-scribe` for documentation.
7. Invoke `run-mirror` for post-session audit.
8. Verdict: CRITICAL → BLOCKED · >0.7 → BLOCKED · 0.3–0.7 → NEEDS_REVIEW · <0.3 → APPROVED
```

---

### skills/run-sentinel/SKILL.md (max 40 tokens)

```markdown
---
name: run-sentinel
description: "Invokes sentinel to perform deep OWASP A01-A09 security scan and secret detection on the PR diff."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "high"
---

# Run Sentinel

Invoke the sentinel sub-agent. Pass the PR diff context and file list.
Collect: list of `{ finding_id, severity, owasp, file, line, description }`.
If any finding has `severity: CRITICAL` → set verdict BLOCKED immediately.
```

---

### skills/run-reviewer/SKILL.md (max 40 tokens)

```markdown
---
name: run-reviewer
description: "Invokes reviewer to compute weighted risk score and identify test coverage gaps."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Run Reviewer

Invoke the reviewer sub-agent. Pass the PR diff and sentinel findings.
Collect: `{ risk_score, verdict, findings, test_gaps }`.
Risk formula: `0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs`.
```

---

### skills/run-scribe/SKILL.md (max 40 tokens)

```markdown
---
name: run-scribe
description: "Invokes scribe to generate changelog entries and JSDoc for changed functions. Skip if verdict is BLOCKED."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Scribe

Skip entirely if verdict is BLOCKED.
Invoke the scribe sub-agent. Pass list of changed files with public functions.
Collect: changelog entry + list of documented functions.
```

---

### skills/run-mirror/SKILL.md (max 40 tokens)

```markdown
---
name: run-mirror
description: "Invokes mirror for post-session self-audit. Mirror checks accuracy and proposes learning PRs. Always runs last."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Mirror

Always invoke mirror after all other agents complete.
Pass the full session summary: all findings, verdicts, agent outputs.
Mirror audits accuracy and may propose a PR to `knowledge/false-positives.md`.
Mirror never merges its own PR — human approval required.
```

---

### Sub-agent agent.yaml template

```yaml
spec_version: "0.1.0"
name: sentinel
version: "1.0.0"
description: "Security scanner — detects OWASP Top 10 vulnerabilities and hardcoded secrets."
author: gitrails-team
license: MIT

model:
  preferred: "${GITRAILS_MODEL}"
  fallback:
    - "${GITRAILS_FALLBACK_MODEL}"
  constraints:
    temperature: 0.1
    max_tokens: 8192

skills:
  - scan-secrets
  - scan-vulnerabilities
  - scan-dependencies

compliance:
  role: analyzer
  permissions: [read, analyze]
  prohibited: [write, commit, audit]
  sod_enforcement: strict

tags:
  - security
  - owasp
  - analyzer
```

**Per-agent values:**

| Agent | temperature | skills | compliance.role |
|-------|-------------|--------|----------------|
| sentinel | 0.1 | scan-secrets, scan-vulnerabilities, scan-dependencies | analyzer |
| reviewer | 0.2 | review-diff, score-risk, suggest-tests | analyzer |
| scribe | 0.4 | generate-changelog, document-module | writer |
| mirror | 0.3 | audit-decisions, propose-learning, contradiction-check | auditor |

---

### Sub-agent domain SKILL.md template

```markdown
---
name: scan-secrets
description: "Detects hardcoded credentials, API keys, tokens. Covers OWASP A07."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security"
  risk_tier: "high"
---

# scan-secrets

1. Scan changed files for: `AKIA`, `sk-`, `ghp_`, `password =`, `secret =`, `api_key`
2. Cross-reference `knowledge/false-positives.md` — skip suppressed patterns
3. Skip: `.env.example`, `*.test.*`, `__mocks__/`, `fixtures/`
4. Output per finding: `finding_id`, `severity: CRITICAL`, `owasp: A07`, `file`, `line`, value as `[REDACTED]`
```

**`allowed-tools` per skill type:**

| Scope | allowed-tools |
|-------|--------------|
| sentinel skills | `read cli` |
| reviewer skills | `read cli` (score-risk: `read`) |
| scribe skills | `read write cli` |
| mirror skills | `read write` (propose-learning: `read write cli`) |

---

### Sub-agent SOUL.md — narrative guidelines

These load in fresh invocations — can be 200-300 words. The narrative matters for judging (30% weight).

**sentinel**: Precision hunter. Redaction reflex. Never cries wolf. Cross-references false-positives. OWASP A01-A09 as mental model.

**reviewer**: Evidence-based scorer. Every finding has file+line or it doesn't get raised. Risk formula is transparent. NEEDS_REVIEW means exactly that — not a hedge.

**scribe**: Accuracy-first. Reads implementation before writing. Never invents behavior. Never touches unchanged code.

**mirror**: Opens with: *"I am gitrails' conscience. I don't review your code. I review gitrails."* Three-strikes rule. Cannot self-merge. Human approval required, always.

---

### .github/workflows/gitrails-pr.yml

```yaml
name: gitrails PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches-ignore:
      - "gitrails/session-**"

jobs:
  gitrails-review:
    name: gitrails Security & Quality Review
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      checks: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"

      - run: npm ci

      - name: Run gitrails
        run: |
          echo "Review PR #${{ github.event.pull_request.number }} — scan for hardcoded secrets and OWASP vulnerabilities." \
          | gitclaw --dir .
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITRAILS_MODEL: groq:llama-3.1-8b-instant
          GITRAILS_FALLBACK_MODEL: groq:llama-3.3-70b-versatile
          GITRAILS_PR_NUMBER: ${{ github.event.pull_request.number }}
          GITRAILS_REPO: ${{ github.repository }}
```

---

### package.json

```json
{
  "name": "gitrails",
  "version": "1.0.0",
  "type": "module",
  "description": "Self-aware, learning engineering teammate — gitagent standard v0.1.0",
  "scripts": {
    "validate": "npx @open-gitagent/gitagent validate",
    "info": "npx @open-gitagent/gitagent info",
    "start": "dotenv -e .env -- gitclaw --dir ."
  },
  "dependencies": {
    "gitclaw": "latest"
  },
  "devDependencies": {
    "@open-gitagent/gitagent": "latest",
    "dotenv-cli": "^11.0.0"
  },
  "keywords": ["gitagent", "gitclaw", "groq", "code-review", "security", "hackathon"],
  "license": "MIT",
  "engines": { "node": ">=18.0.0" }
}
```

---

### .env / .env.example

```
GROQ_API_KEY=your-groq-api-key-here
GITHUB_TOKEN=your-github-pat-here
GITRAILS_MODEL=groq:llama-3.1-8b-instant
GITRAILS_FALLBACK_MODEL=groq:llama-3.3-70b-versatile
```

### .gitignore

```
.env
node_modules/
.gitagent/
.DS_Store
*.log
```

### .gitclaw/config.yaml

```yaml
agent_dir: "."
model: "${GITRAILS_MODEL}"
max_turns: 50
timeout: 120
hooks:
  enabled: true
audit:
  enabled: true
  path: ".gitagent/audit.jsonl"
```

### hooks/hooks.yaml

```yaml
hooks:
  on_session_start:
    - script: scripts/bootstrap.sh
      description: "Load memory context"
  pre_tool_use:
    - script: scripts/pre-tool-audit.sh
      description: "Log tool call, block protected branch writes"
      compliance: true
  post_response:
    - script: scripts/post-response-check.sh
      description: "Validate no raw secrets in output"
      compliance: true
  on_error:
    - script: scripts/teardown.sh
      description: "Reset state on error"
```

### hooks/scripts/bootstrap.sh

```bash
#!/bin/bash
set -e
cat knowledge/patterns.md >> memory/runtime/context.md 2>/dev/null || true
cat knowledge/false-positives.md >> memory/runtime/context.md 2>/dev/null || true
echo '{ "action": "allow" }'
```

The other three hook scripts (`pre-tool-audit.sh`, `post-response-check.sh`, `teardown.sh`) can be stubs that echo `{ "action": "allow" }`. All four must be `chmod +x`.

---

## Judging Criteria

| Criterion | Weight | How to win |
|-----------|--------|-----------|
| Agent Quality | 30% | Rich sub-agent SOUL.md narratives. Numbered RULES.md. DUTIES.md with SOD. mirror's unique conscience role. |
| Skill Design | 25% | Spec-accurate frontmatter. `allowed-tools` uses gitclaw built-ins. `run-*` skill pattern shows real orchestration. |
| Working Demo | 25% | `validate` passes (0 warnings). `info` shows 4 agents + 5 skills. `npm start` responds to prompts. Real PR triggers Actions. |
| Creativity | 20% | mirror as self-auditing conscience. Human-gated learning. SOD across all 4 agents. Improves with every session. |

---

## Build Order

```
1.  mkdir gitrails && cd gitrails && git init
2.  Create package.json → npm install
3.  .gitignore + .env + .env.example
4.  agent.yaml — exact content above (skills: 5, NO delegation block)
5.  SOUL.md — short version (~80 tokens)
6.  RULES.md — short version (~100 tokens)
7.  AGENTS.md
8.  agents/mirror/ — build FIRST (no SKILL.md at agent root — spec doesn't allow it)
      agent.yaml · SOUL.md · RULES.md
      skills/audit-decisions/SKILL.md   (allowed-tools: read write)
      skills/propose-learning/SKILL.md  (allowed-tools: read write cli)
      skills/contradiction-check/SKILL.md (allowed-tools: read write)
9.  agents/sentinel/ — agent.yaml + SOUL.md + RULES.md + 3 skills
10. agents/reviewer/ — agent.yaml + SOUL.md + RULES.md + 3 skills
11. agents/scribe/   — agent.yaml + SOUL.md + RULES.md + 2 skills
12. skills/review-pr/SKILL.md
13. skills/run-sentinel/SKILL.md
14. skills/run-reviewer/SKILL.md
15. skills/run-scribe/SKILL.md
16. skills/run-mirror/SKILL.md
17. tools/*.yaml — 5 files
18. memory/ — memory.yaml, MEMORY.md, runtime/*.md
19. knowledge/ — index.yaml, graph.json={}, *.md
20. hooks/ — hooks.yaml + 4 scripts (chmod +x)
21. compliance/, config/, examples/
22. .gitclaw/config.yaml + .gitagent/.gitkeep
23. .github/workflows/ — 3 files
24. README.md + CONTRIBUTING.md
25. npx @open-gitagent/gitagent validate   ← must be 0 errors, 0 warnings
26. npx @open-gitagent/gitagent info       ← must show 4 agents + 5 skills
27. npm start → type prompt → model must respond without function call error
28. git add . && git commit -m "feat: gitrails v1.0.0 — gitagent hackathon 2026"
```

---

## Testing

```bash
# Spec (instant, no API)
npx @open-gitagent/gitagent validate
npx @open-gitagent/gitagent info

# Interactive (needs .env)
npm start
→ Scan this codebase for hardcoded secrets and OWASP vulnerabilities

# Demo PR (needs GROQ_API_KEY in GitHub secrets)
git checkout -b demo/vuln-scan
cat > vuln.js << 'EOF'
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
const query = "SELECT * FROM users WHERE id = " + userId;
EOF
git add vuln.js && git commit -m "demo: hardcoded key + SQL injection"
git push origin demo/vuln-scan
# Open PR → Actions fires → sentinel catches CRITICAL → PR blocked
```

---

## What Makes gitrails Unique

**mirror — the conscience**: Runs last. Reviews gitrails' own accuracy. Proposes suppressions via PR (3-strikes rule). Never self-merges. Human approval always required.

**Human-gated memory**: `knowledge/` only changes through approved mirror PRs. Learns with your permission.

**Segregation of Duties**: sentinel/reviewer = analyzer. scribe = writer. mirror = auditor. Compliance by design.

**`run-*` skill pattern**: Sub-agents invoked independently in fresh contexts — no context pollution, no Groq function-call overload.

---

*gitrails — GitAgent Hackathon 2026 · gitagent spec v0.1.0 · gitclaw · groq:llama-3.1-8b-instant (primary) · $0*
