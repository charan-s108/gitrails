<div align="center">

<pre>
  ██████╗ ██╗████████╗██████╗  █████╗ ██╗██╗     ███████╗
 ██╔════╝ ██║╚══██╔══╝██╔══██╗██╔══██╗██║██║     ██╔════╝
 ██║  ███╗██║   ██║   ██████╔╝███████║██║██║     ███████╗
 ██║   ██║██║   ██║   ██╔══██╗██╔══██║██║██║     ╚════██║
 ╚██████╔╝██║   ██║   ██║  ██║██║  ██║██║███████╗███████║
  ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
</pre>

### *Your codebase has a new teammate. It never misses a PR.*

[![gitagent](https://img.shields.io/badge/gitagent-spec%20v0.1.0-6366f1?style=flat-square&logo=git&logoColor=white)](https://github.com/open-gitagent/gitagent)
[![groq](https://img.shields.io/badge/Groq-free%20tier-F55036?style=flat-square)](https://console.groq.com)
[![gitclaw](https://img.shields.io/badge/runtime-gitclaw-0f172a?style=flat-square)](https://github.com/open-gitagent/gitclaw)
[![cost](https://img.shields.io/badge/API%20cost-%240-22c55e?style=flat-square)](https://console.groq.com)
[![license](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)](LICENSE)

</div>

---

**gitrails** is a four-agent AI code review system that runs in your terminal before every push. It scans for OWASP vulnerabilities, scores code quality risk, generates changelogs, and then audits its own decisions through a self-reviewing agent called `mirror`. Runs on Groq's free tier — $0 API cost.

---

## How it works

```
git diff → sentinel → reviewer → scribe → mirror → formatted report
```

Each agent runs in an isolated context — no shared memory, no context pollution.

| Agent | Role | Does |
|-------|------|------|
| **sentinel** | Security scanner | OWASP A01-A09 · hardcoded secrets · injection patterns |
| **reviewer** | Risk scorer | Weighted 0.0–1.0 score · bug patterns · test gaps |
| **scribe** | Docs writer | Changelog entries · JSDoc for changed functions |
| **mirror** | Self-auditor | Reviews gitrails' own findings · proposes learning PRs |

**Verdict gate:**

| Score | Verdict |
|-------|---------|
| Any `CRITICAL` finding | `BLOCKED` — regardless of score |
| Risk > 0.7 | `BLOCKED` |
| Risk 0.3–0.7 | `NEEDS_REVIEW` |
| Risk < 0.3 | `APPROVED` |

---

## Architecture

<div align="center">
  <img src="assets/architecture.png" alt="gitrails architecture" width="800" />
</div>

---

## mirror — the conscience

Most AI review tools are stateless: run, output, forget. gitrails is different because of `mirror`.

After every scan, mirror asks: *Did we over-flag? Did we miss something? Have we drifted from our original intent?*

When it finds something worth learning, it opens a PR to `knowledge/`. A human merges it or doesn't. gitrails never self-modifies — it improves through collaboration, the way a good engineer should.

```
mirror → proposes PR to knowledge/false-positives.md
                    ↓
           human reviews + approves
                    ↓
       gitrails learns, stays accountable
```

---

## Quick start

### Prerequisites

- Node.js 18+
- [Groq API key](https://console.groq.com) — free, no credit card
- gitclaw: `npm install -g gitclaw`

### Install

```bash
git clone https://github.com/charan-s108/gitrails.git
cd gitrails
npm install
```

### Configure

```bash
cp .env.example .env
# Add your GROQ_API_KEY
```

### Validate the spec

```bash
npm run validate    # must exit 0
npm run info        # shows 4 agents + 5 skills
```

### Run a review

```bash
npm run review      # scans your current HEAD diff — full pipeline
```

---

## Live demo

Three pre-staged scenarios show each verdict state:

```bash
npm run demo:blocked       # hardcoded AWS key + SQL injection → BLOCKED
npm run demo:needs-review  # weak JWT + missing null checks → NEEDS_REVIEW
npm run demo:clean         # pure utility functions → APPROVED
```

Each command scopes the diff to only that scenario's directory, so the LLM sees only the relevant code.

**Example output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 gitrails Review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VERDICT: BLOCKED

SENTINEL
  [CRITICAL] scenarios/blocked/vuln.js:2 — Hardcoded AWS access key [REDACTED] (OWASP A07)
  [CRITICAL] scenarios/blocked/vuln.js:7 — SQL string concatenation with user input (OWASP A03)
  [HIGH] scenarios/blocked/vuln.js:12 — Hardcoded admin backdoor with plaintext password (OWASP A07)

REVIEWER   Risk: 0.91
  High security severity from 2 CRITICAL findings drives score above threshold.

SCRIBE
  Skipped — verdict is BLOCKED.

MIRROR
  OBSERVATION: All three findings are genuine. Risk score accurately reflects severity.
  FALSE_POSITIVE: None.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Guardrails

**Segregation of duties** — enforced at the agent level, not just as documentation:

| Agent | Role | Can read | Can write | Can audit |
|-------|------|:--------:|:---------:|:---------:|
| sentinel | analyzer | ✓ | — | — |
| reviewer | analyzer | ✓ | — | — |
| scribe | writer | ✓ | ✓ | — |
| mirror | auditor | ✓ | PR only | ✓ |
| human | approver | ✓ | ✓ | ✓ |

`analyzer` and `auditor` roles cannot be held by the same agent. Validated by `gitagent validate`.

**Branch protection** — `RULES.md` and the `preToolUse` hook both hard-block writes to `main`, `master`, `develop`, and `release/*`.

**Human-in-the-loop** — no agent auto-merges. All learning PRs from mirror require human approval.

**Audit logging** — every tool call writes to `.gitagent/audit.jsonl`. Immutable, 90-day retention.

---

## Project structure

```
gitrails/
├── agent.yaml              # orchestrator (gitagent spec v0.1.0)
├── SOUL.md                 # identity
├── RULES.md                # hard constraints
│
├── agents/
│   ├── sentinel/           # security scanner
│   ├── reviewer/           # risk scorer
│   ├── scribe/             # docs writer
│   └── mirror/             # self-auditor ← unique
│
├── skills/
│   ├── review-pr/          # entry point
│   ├── run-sentinel/       # invoke sentinel
│   ├── run-reviewer/       # invoke reviewer
│   ├── run-scribe/         # invoke scribe
│   └── run-mirror/         # invoke mirror
│
├── scenarios/              # demo files (blocked / needs-review / clean)
├── knowledge/              # human-approved long-term memory
├── memory/                 # session state
├── hooks/                  # gitclaw lifecycle hooks
├── tools/                  # MCP schema docs
├── assets/                 # diagrams + demo media
└── .github/workflows/      # spec validation on every PR
```

---

## Configuration

Only two env vars are required:

```bash
GROQ_API_KEY=your-groq-api-key          # free at console.groq.com
GITRAILS_MODEL=groq:moonshotai/kimi-k2-instruct
GITRAILS_FALLBACK_MODEL=groq:llama-3.3-70b-versatile
```

To switch models: edit `.env` only. No code changes needed.

---

## GitAgent Hackathon 2026

Built for [GitAgent Hackathon 2026](https://hackculture.io/hackathons/gitagent-hackathon) — HackCulture × Lyzr.

What makes this submission different:

- **`mirror`** — a self-auditing agent that reviews the reviewer. No other submission has this.
- **Human-gated memory** — `knowledge/` only changes through approved mirror PRs. Learns with your permission.
- **Isolation by design** — sub-agents load in fresh contexts via the `run-*` skill pattern. No Groq function-call overload.
- **SOD by architecture** — not a policy doc, an enforced constraint on every agent's `agent.yaml`.

---

<div align="center">

**[Charan S](https://github.com/charan-s108)** · [charansrinivas108@gmail.com](mailto:charansrinivas108@gmail.com)

*gitagent spec v0.1.0 · gitclaw · groq:moonshotai/kimi-k2-instruct · $0*

</div>
