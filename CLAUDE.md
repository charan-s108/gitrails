# CLAUDE.md — gitrails

> Read before touching any file. This is the source of truth.
> Built for: GitAgent Hackathon 2026 — HackCulture × Lyzr

---

## What gitrails is

A multi-agent AI code review system built on **gitagent spec v0.1.0**, runtime is **gitclaw**.

Four specialist agents in sequence:
- **sentinel** — OWASP A01-A09 + hardcoded secrets
- **reviewer** — weighted risk score (0.0–1.0), test coverage gaps, bug patterns
- **scribe** — changelog entries + JSDoc for changed functions
- **mirror** — reviews gitrails' own decisions, proposes learning via human-approved PRs

**Key differentiator**: `mirror` is gitrails' conscience. It never self-modifies — it proposes PRs to `knowledge/`. Humans approve them. This is how gitrails earns trust over time.

---

## Branch strategy

One branch: `main`. That's it.

Never create feature branches, session branches, or release branches.
The gitclaw runtime creates temporary `gitrails/session-{uuid}` branches during its own commits — that is internal and cleaned up automatically.

---

## How it runs

### Locally (primary workflow)

```bash
npm run review             # full pipeline on current HEAD diff
npm run demo:blocked       # scan scenarios/blocked/ — expects BLOCKED verdict
npm run demo:needs-review  # scan scenarios/needs-review/ — expects NEEDS_REVIEW
npm run demo:clean         # scan scenarios/clean/ — expects APPROVED
npm start                  # interactive REPL mode
```

All commands use `dotenv -e .env` to inject credentials. Output is filtered through perl to suppress tool-call noise — only the final formatted report reaches the terminal.

### GitHub Actions

CI runs `npx @open-gitagent/gitagent validate` and `info` only. The full AI scan does NOT run in CI — gitclaw requires an interactive-capable environment and the Groq API behaves differently without TTY. Run `npm run review` locally before pushing.

---

## Demo scenarios

Three pre-staged files in `scenarios/` demonstrate the three verdict states:

| Path | Contents | Expected verdict |
|------|----------|-----------------|
| `scenarios/blocked/vuln.js` | Hardcoded AWS key, SQL injection, admin backdoor | BLOCKED |
| `scenarios/needs-review/auth.js` | Weak JWT handling, missing null checks, stack trace exposure | NEEDS_REVIEW |
| `scenarios/clean/utils.js` | Pure utility functions, no security surface | APPROVED |

The `demo:*` scripts scope `git diff` to only that subdirectory so the LLM sees only the relevant code.

---

## Stack

| Layer | Choice |
|-------|--------|
| Agent runtime | gitclaw (`npm install -g gitclaw`) |
| Model (primary) | `groq:moonshotai/kimi-k2-instruct` |
| Model (fallback) | `groq:llama-3.3-70b-versatile` |
| Spec validator | `@open-gitagent/gitagent` |
| Language | Node.js 18+ ESM |

---

## Architecture — how sub-agents load independently

This is the most critical architectural decision. Get it wrong and Groq function calling breaks.

**Do NOT use `delegation: mode: auto`** — it dumps all sub-agent contexts into the root prompt simultaneously, blowing past Groq's reliable function-call token limit.

**The working pattern**: root agent has five brief `run-*` skill descriptors (~40 tokens each). Each tells gitclaw when and how to invoke that sub-agent. When a sub-agent runs, it opens a **fresh invocation** with only its own context loaded.

```
Root context while running:
  SOUL.md + RULES.md       ~180 tokens
  review-pr/SKILL.md       ~120 tokens
  4 × run-*/SKILL.md       ~160 tokens
  tool schemas             ~200 tokens
  ─────────────────────────────────────
  Total                    ~660 tokens  ✓ under Groq limit
```

Sub-agent context is ~400 tokens, loaded only when that agent is actually invoked.

---

## gitclaw built-in tools only

```yaml
allowed-tools: read cli      # CORRECT
allowed-tools: Read Bash     # WRONG — causes "Failed to call a function"
```

`tools/*.yaml` files are MCP schema documentation for judging — they are NOT runtime-callable.

---

## Token budget

| File | Max tokens |
|------|-----------|
| Root SOUL.md | 80 |
| Root RULES.md | 100 |
| `review-pr/SKILL.md` | 120 |
| Each `run-*/SKILL.md` | 40 |

Sub-agent SOUL.md files can be longer — they load in isolated fresh invocations.

---

## File structure

```
gitrails/
├── agent.yaml                    # root orchestrator (gitagent spec v0.1.0)
├── SOUL.md                       # identity — max 80 tokens
├── RULES.md                      # hard constraints — max 100 tokens
├── AGENTS.md                     # agent roster table
│
├── agents/
│   ├── sentinel/                 # OWASP + secrets scanner
│   ├── reviewer/                 # risk scorer
│   ├── scribe/                   # changelog + docs writer
│   └── mirror/                   # self-auditor
│   (each has: agent.yaml, SOUL.md, RULES.md, skills/)
│
├── skills/                       # root orchestration skills
│   ├── review-pr/SKILL.md        # entry point
│   ├── run-sentinel/SKILL.md
│   ├── run-reviewer/SKILL.md
│   ├── run-scribe/SKILL.md
│   └── run-mirror/SKILL.md
│
├── scenarios/                    # demo files for live demos
│   ├── blocked/vuln.js           # hardcoded key + SQL injection
│   ├── needs-review/auth.js      # weak JWT + missing null checks
│   └── clean/utils.js            # pure utility, no issues
│
├── tools/                        # MCP schema docs (not runtime)
├── hooks/                        # gitclaw lifecycle hooks
├── memory/                       # session state
├── knowledge/                    # human-approved long-term memory
├── compliance/                   # audit schema + SOD policy
├── config/                       # default + production configs
├── assets/                       # architecture diagrams, demo GIFs
│
├── .github/workflows/
│   └── gitrails-pr.yml           # spec validation only (validate + info)
├── .gitclaw/config.yaml
└── package.json
```

**Never create:** `scripts/`, `bin/`, `retrieval/`, `workflows/` (outside `.github/`).

---

## Common mistakes

1. **`version` must be a quoted string** — `version: "1.0.0"` not `version: 1.0.0`
2. **No SKILL.md at agent root** — spec doesn't allow it there
3. **No `delegation:` block in root agent.yaml** — causes context overload
4. **Skill directories contain ONLY `SKILL.md`** — delete any agent.yaml/SOUL.md gitclaw scaffolding creates inside skill dirs
5. **`GROQ_API_KEY` in `.env`** — never hardcode, never commit

---

## Judging criteria

| Criterion | Weight | What wins |
|-----------|--------|-----------|
| Agent Quality | 30% | Rich sub-agent SOUL.md narratives · numbered RULES.md · mirror's conscience role · SOD |
| Skill Design | 25% | Spec-accurate frontmatter · gitclaw built-ins only · `run-*` pattern shows real orchestration |
| Working Demo | 25% | `validate` exits 0 · `info` shows 4 agents + 5 skills · `npm run demo:blocked` shows BLOCKED |
| Creativity | 20% | mirror as self-auditing conscience · human-gated learning · SOD across all 4 agents |

---

*gitrails — GitAgent Hackathon 2026 · gitagent spec v0.1.0 · gitclaw · groq:moonshotai/kimi-k2-instruct*
