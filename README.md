<div align="center">

<br/>

<pre>
  ██████╗ ██╗████████╗██████╗  █████╗ ██╗██╗     ███████╗
 ██╔════╝ ██║╚══██╔══╝██╔══██╗██╔══██╗██║██║     ██╔════╝
 ██║  ███╗██║   ██║   ██████╔╝███████║██║██║     ███████╗
 ██║   ██║██║   ██║   ██╔══██╗██╔══██║██║██║     ╚════██║
 ╚██████╔╝██║   ██║   ██║  ██║██║  ██║██║███████╗███████║
  ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
</pre>

### *Your codebase has a new teammate. It never misses a PR.*

<br/>

[![gitagent](https://img.shields.io/badge/gitagent-spec%20v0.1.0-6366f1?style=flat-square&logo=git&logoColor=white)](https://github.com/open-gitagent/gitagent)
[![groq](https://img.shields.io/badge/Groq-free%20tier-F55036?style=flat-square&logo=groq&logoColor=white)](https://console.groq.com)
[![gitclaw](https://img.shields.io/badge/runtime-gitclaw-0f172a?style=flat-square)](https://github.com/open-gitagent/gitclaw)
[![cost](https://img.shields.io/badge/API%20cost-%240-22c55e?style=flat-square)](https://console.groq.com)
[![license](https://img.shields.io/badge/license-MIT-f59e0b?style=flat-square)](LICENSE)
[![hackathon](https://img.shields.io/badge/GitAgent%20Hackathon-2026-blueviolet?style=flat-square)](https://hackculture.io/hackathons/gitagent-hackathon)

<br/>

> **gitrails** is a multi-agent AI system that lives inside your git repository.
> It reviews every PR — scanning secrets, OWASP vulnerabilities, code quality,
> and documentation gaps — using a local vector index and code graph so it reads
> 30 lines instead of 500. It learns your team's patterns through human-approved
> memory PRs. It gets more precise the longer it runs.

<br/>

</div>

---

<div align="center">

**[How it works](#-demo) · [Agents](#-agent-roster) · [Retrieval](#-retrieval-layer) · [Risk scoring](#-risk-gate) · [Guardrails](#-guardrails) · [Quick start](#-quick-start) · [Deploy](#-deployment)**

</div>

---

<br/>

## ⚡ Why gitrails

Most code review tools are stateless — they run, produce output, and forget everything. Next PR, same noise. gitrails is different on two axes that no other tool in this hackathon addressed:

**Token-efficient retrieval.** Before any agent reads a file, it queries a local vector index and returns file paths with line ranges. The agent reads 30 lines instead of 500. On Groq free tier (6000 TPM), that's the difference between 2 complete reviews per day and 20+.

**Self-learning through human supervision.** The `mirror` agent audits gitrails' own decisions after every session. When it finds something worth learning, it opens a PR to `knowledge/`. A human merges it or doesn't. gitrails never self-modifies. It improves through collaboration — the way a good engineer should.

<br/>

---

## 🏗 Architecture

<div align="center">
     <img src="assets/architecture.png" alt="gitrails architecture" width="860" />
</div>

<br/>

---

## 🤖 Agent Roster

gitrails runs four specialist agents in parallel, each with a defined role and strict separation of duties.

### 🔴 sentinel — Security Scanner
`SOD role: analyzer` &nbsp;·&nbsp; `temperature: 0.1` &nbsp;·&nbsp; `skills: 3`

The most paranoid member of the team. sentinel never gives the benefit of the doubt. If it looks like a secret, it flags it. If a dependency has a CVE, it reports the exact CVE number, severity score, and fixed version. It cross-references `knowledge/false-positives.md` before every flag — so learned suppressions apply from session one.

| Skill | What it detects |
|-------|----------------|
| `scan-secrets` | Hardcoded credentials · API keys · private keys · high-entropy strings · 50+ provider patterns |
| `scan-vulnerabilities` | OWASP A01–A09 · SQL injection · eval() · XSS · command injection · insecure crypto |
| `scan-dependencies` | CVE cross-reference via lock files · unpinned ranges · abandoned packages |

**OWASP coverage:**

```
A01 Broken Access Control    A02 Cryptographic Failures   A03 Injection
A05 Misconfiguration         A06 Vulnerable Components    A07 Auth Failures
A09 Security Logging Failures
```

<br/>

### 🟡 reviewer — Code Quality
`SOD role: analyzer` &nbsp;·&nbsp; `temperature: 0.2` &nbsp;·&nbsp; `skills: 3`

reviewer reads diffs the way a senior engineer would — looking for logical errors, complexity hotspots, and missing test coverage. It uses the code graph's `getHotspots()` for complexity analysis without reading a single file. Its output is a weighted risk score from 0.0 to 1.0 that gates PR progression.

| Skill | What it produces |
|-------|----------------|
| `review-diff` | Bug patterns · anti-patterns · performance regressions · null dereferences |
| `score-risk` | Weighted composite score from 5 dimensions — gates the PR |
| `suggest-tests` | Missing test cases for new and modified functions |

**Risk formula:**

```
risk = (0.35 × security_severity)
     + (0.25 × bug_probability)
     + (0.20 × complexity_delta)    ← from code graph, zero file reads
     + (0.10 × test_coverage_gap)
     + (0.10 × documentation_debt)
```

<br/>

### 🟢 scribe — Documentation
`SOD role: writer` &nbsp;·&nbsp; `temperature: 0.4` &nbsp;·&nbsp; `skills: 2`

scribe finds every undocumented public function in the changed files — without loading entire files — and generates comments that match the repo's existing style (JSDoc, Python docstrings, or Go comments). It also produces a CHANGELOG entry from the diff description.

| Skill | What it produces |
|-------|----------------|
| `generate-changelog` | Keep a Changelog format entry from git history and diff |
| `document-module` | Style-matched docstrings for all new/modified public functions |

<br/>

### 🪞 mirror — Self-Auditor *(the unique agent)*
`SOD role: auditor` &nbsp;·&nbsp; `temperature: 0.3` &nbsp;·&nbsp; `skills: 3`

mirror doesn't review your code. It reviews gitrails. After every session, it looks at what the other three agents flagged and asks: *did we over-flag? Did we miss something? Have our rules drifted from our original intent?*

When it finds something worth learning — a false positive the team keeps dismissing, a convention gitrails keeps misreading — it opens a PR to `knowledge/`. A human approves or rejects it. gitrails never self-modifies. mirror is the reason it doesn't become noisy and useless over time.

| Skill | What it does |
|-------|-------------|
| `audit-decisions` | Reviews gitrails' own findings for over-reach or blind spots |
| `propose-learning` | Opens a PR to `knowledge/false-positives.md` or `knowledge/patterns.md` |
| `contradiction-check` | Detects drift between SOUL.md, RULES.md, and observed behaviour |

> mirror cannot write to `knowledge/` directly. It can only open PRs.
> Humans decide what gitrails learns. This is compliance-by-design.

<br/>

---

## 🔍 Retrieval Layer

Every competing tool reads entire source files into context on every run. gitrails doesn't.

<br/>

**The problem with full-file reads:**

```
Without retrieval:
  500-line file  =  ~4,000 tokens
  4 agents × 10 files  =  160,000 tokens per run
  Groq free tier (6000 TPM): quota gone in 2 runs per day
```

**The gitrails approach:**

```
agent query  →  vector index  →  file:line range  →  read 30 lines

"authentication token validation logic"
          │
          ▼
  vectra vector index
  (Xenova/all-MiniLM-L6-v2, runs locally in Node.js, zero API cost)
          │
          ▼
  [{ file: "src/auth/session.js", start_line: "44", end_line: "71", score: 0.96 }]
          │
          ▼
  git-read src/auth/session.js lines 44–71
  → 28 lines loaded vs 480 for the full file
  → 94% token saving on this query
```

**Code graph structural queries — zero file reads:**

| Query | API call | Files read |
|-------|----------|------------|
| High-complexity hotspots | `getHotspots(threshold)` | 0 |
| All callers of a function | `findCallers(symbol)` | 0 |
| Function inventory | `getFunctions(filePath)` | 0 |

**Net result:** 60–95% fewer tokens per full scan. 20+ complete review cycles per day on the free tier.

**Why not Neo4j / Pinecone / ChromaDB?**
gitclaw is Node.js only. External vector databases require infrastructure gitrails cannot assume. `vectra` stores its index as local JSON files inside the repo. `@xenova/transformers` runs the embedding model entirely in-process. Zero infrastructure. Zero API cost. Rebuilds automatically at bootstrap if missing.

<br/>

---

## 🚦 Risk Gate

| Score | Label | What happens |
|-------|-------|-------------|
| `< 0.3` | — | Draft PR opened — auto-approve suggested |
| `0.3 – 0.7` | `gitrails/needs-review` | PR opened — human review required |
| `> 0.7` | `gitrails/blocked` | PR blocked — cannot merge |
| Any `CRITICAL` finding | `gitrails/blocked` | Blocked regardless of numeric score |

<br/>

---

## 🛡 Guardrails

Six layers of safety — enforced at different levels so no single failure mode bypasses all of them.

<br/>

**Branch isolation**
All work happens on `gitrails/session-{uuid}`. A `preToolUse` hook and `RULES.md` both hard-block writes to `main`, `master`, `develop`, and `release/*`. Two independent enforcement points.

**Diff validation before commit**
Before `git commit` runs, the dispatch skill validates: scope (no writes outside task paths), secrets (no credential patterns in staged diff), and alignment (file count consistent with task). Any failure triggers `git reset --hard HEAD` and opens a violation-report PR with no code changes.

**Human-in-the-loop**
No agent auto-merges. All PRs require human approval. Memory updates (mirror's learning PRs) require a human merge. `agent.yaml` sets `human_in_the_loop: conditional`, `kill_switch: true`, `override_capability: true`.

**Audit logging**
Every tool invocation writes to `.gitagent/audit.jsonl`. Entries are append-only and immutable — the `preToolUse` hook blocks modification of existing entries. Retention: 90 days.

**Segregation of duties**

| Agent | Role | Reads | Writes | Audits |
|-------|------|:-----:|:------:|:------:|
| sentinel | analyzer | ✓ | — | — |
| reviewer | analyzer | ✓ | — | — |
| scribe | writer | ✓ | ✓ | — |
| mirror | auditor | ✓ | PR only | ✓ |
| human | approver | ✓ | ✓ | ✓ |

`analyzer` and `auditor` roles cannot be held by the same agent. Validated by `gitagent validate --compliance`.

**Failure handling**
Tool failure → retry once → log `BLOCKED` → skip skill → continue. Agent timeout → `git reset --hard` → open draft PR with partial findings labelled `gitrails/incomplete`. Session crash → `on_error` hook posts PR comment. No silent failures, ever.

<br/>

---

## 🎬 Demo

<div align="center">

![gitrails demo](assets/demo.gif)

</div>

<br/>

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- Git
- [Groq API key](https://console.groq.com) (free, no credit card)
- GitHub Personal Access Token (scopes: `repo`, `pull_requests`)
- gitclaw runtime: `npm install -g gitclaw`

<br/>

### 1 — Clone and install

```bash
git clone https://github.com/charan-s108/gitrails.git
cd gitrails
npm install
```

### 2 — Configure

```bash
cp .env.example .env
```

Add your keys to `.env`:

```bash
GROQ_API_KEY=your-groq-api-key     # free at console.groq.com
GITHUB_TOKEN=your-github-pat       # repo + pull_requests scopes
```

To switch models in the future — edit **only** `.env`:

```bash
GITRAILS_MODEL=groq:llama-3.3-70b-versatile   # or any groq: model
GITRAILS_FALLBACK_MODEL=groq:llama-3.1-8b-instant
```

No code changes needed. All agents, workflows, and scripts read from these env vars.

### 3 — Build the retrieval layer

```bash
npm run index:build   # downloads embedding model (~80 MB once), builds vector index
npm run graph:build   # builds code graph from repo files
```

First run: ~60 seconds. Every run after: under 5 seconds.

### 4 — Validate

```bash
npm run validate      # uses @open-gitagent/gitagent — must exit 0
npm run info          # shows all 4 agents + 12 skills
```

### 5 — Run the demo

```bash
npm run demo          # indexes demo-target/ then scans it for vulnerabilities
npm run demo:setup    # rebuild index from demo-target/ only
npm run demo:scan     # run the security scan (requires GROQ_API_KEY)
```

Or start an interactive session:

```bash
npm start             # gitclaw --dir . (REPL mode)
```

<br/>

---

## ⚙️ Configuration

All configuration is in `.env`. Only `GROQ_API_KEY` and `GITHUB_TOKEN` are required.

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | Groq API key · required · [get free](https://console.groq.com) |
| `GITHUB_TOKEN` | — | GitHub PAT · required |
| `GITRAILS_MODEL` | `groq:llama-3.3-70b-versatile` | Primary model — edit `.env` to switch |
| `GITRAILS_FALLBACK_MODEL` | `groq:llama-3.1-8b-instant` | Fallback model |
| `GITRAILS_RISK_THRESHOLD` | `0.3` | Score below which PRs auto-approve |
| `GITRAILS_AUDIT_RETENTION_DAYS` | `90` | Days to retain audit.jsonl |
| `GITRAILS_EMBEDDING_MODEL` | `Xenova/all-MiniLM-L6-v2` | Local embedding model |
| `GITRAILS_CHUNK_SIZE` | `512` | Lines per vector chunk |
| `GITRAILS_CHUNK_OVERLAP` | `64` | Overlap between consecutive chunks |
| `GITRAILS_TOP_K` | `5` | Results returned per semantic-search query |

**Groq free tier limits:**

| Model | RPM | TPM | Cost |
|-------|-----|-----|------|
| `groq:llama-3.3-70b-versatile` | 30 | 6,000 | $0 |
| `groq:llama-3.1-8b-instant` | 30 | 6,000 | $0 |

<br/>

---

## 🚀 Deployment

### GitHub Actions — recommended

No infrastructure. gitrails runs inside the Actions runner on every PR.

```bash
# Copy the workflow to your target repo
cp .github/workflows/gitrails-pr.yml /path/to/your-repo/.github/workflows/

# Add GROQ_API_KEY as a repository secret
# GITHUB_TOKEN is provided automatically by Actions
```

Open a pull request. gitrails runs automatically.

### gitclaw CLI

```bash
npm install -g gitclaw

export GROQ_API_KEY="your-key"
export GITHUB_TOKEN="your-token"

gitclaw --dir /path/to/gitrails --repo https://github.com/org/repo "Review PR #42"
```

### Docker

```bash
docker build -t gitrails .

docker run --rm \
  -e GROQ_API_KEY="your-key" \
  -e GITHUB_TOKEN="your-token" \
  -e GITRAILS_MODEL="groq:llama-3.3-70b-versatile" \
  -e GITRAILS_FALLBACK_MODEL="groq:llama-3.1-8b-instant" \
  -v $(pwd):/workspace \
  gitrails
```

<br/>

---

## 📁 Project Structure

```
gitrails/
│
├── agent.yaml                    orchestrator manifest (gitagent spec v0.1.0)
├── SOUL.md                       orchestrator identity and values
├── RULES.md                      hard constraints — what gitrails must never do
├── DUTIES.md                     segregation of duties policy
│
├── agents/
│   ├── sentinel/                 security scanner (SOD: analyzer)
│   │   └── skills/
│   │       ├── scan-secrets/
│   │       ├── scan-vulnerabilities/
│   │       └── scan-dependencies/
│   ├── reviewer/                 code quality + risk scoring (SOD: analyzer)
│   │   └── skills/
│   │       ├── review-diff/
│   │       ├── score-risk/
│   │       └── suggest-tests/
│   ├── scribe/                   documentation generator (SOD: writer)
│   │   └── skills/
│   │       ├── generate-changelog/
│   │       └── document-module/
│   └── mirror/                   self-auditor (SOD: auditor) ← unique
│       └── skills/
│           ├── audit-decisions/
│           ├── propose-learning/
│           └── contradiction-check/
│
├── skills/                       orchestrator-level skills
│   ├── triage/
│   ├── dispatch/
│   └── synthesize/
│
├── retrieval/                    token-efficient retrieval layer
│   ├── index.js                  vectra vector index builder + query API
│   ├── graph.js                  code graph builder + traversal
│   └── embedder.js               @xenova/transformers wrapper
│
├── tools/                        MCP-compatible tool definitions
│   ├── git-read.yaml
│   ├── git-write.yaml
│   ├── pr-comment.yaml
│   ├── audit-log.yaml
│   └── semantic-search.yaml
│
├── memory/                       live session state
│   ├── MEMORY.md                 current state (200 line max)
│   └── runtime/
│       ├── context.md            session scratch — cleared on teardown
│       ├── dailylog.md           appended each session
│       └── key-decisions.md
│
├── knowledge/                    human-approved long-term memory
│   ├── graph.json                code graph adjacency list (git-tracked)
│   ├── vector-index/             vectra JSON index (gitignored, rebuilt at bootstrap)
│   ├── patterns.md               team coding patterns
│   ├── team-preferences.md       how this team likes reviews
│   └── false-positives.md        learned suppressions
│
├── hooks/
│   ├── hooks.yaml                gitclaw lifecycle hooks
│   └── scripts/
│       ├── bootstrap.sh          load memory + build/load retrieval layer
│       ├── pre-tool-audit.sh     log + gate every tool call
│       ├── post-response-check.sh validate output before delivery
│       └── teardown.sh           propose learnings + clear scratch
│
├── compliance/
│   ├── audit.yaml                audit log schema + retention policy
│   └── sod-policy.md             SOD documentation
│
├── workflows/
│   └── pr-review.yaml            SkillsFlow PR review pipeline
│
├── .github/workflows/
│   ├── gitrails-pr.yml           triggers on PR open/sync/reopen
│   ├── gitrails-validate.yml     runs npm run validate on every push
│   └── gitrails-weekly.yml       weekly maintenance + memory audit
│
├── examples/
│   └── demo-flow.md              end-to-end demo walkthrough
│
├── DEMO_SCRIPT.md                video recording walkthrough
├── Dockerfile                    multi-stage container build
├── requirements.txt              Python hook script dependencies
└── .env.example                  environment variable reference
```

<br/>

---

## 🏆 GitAgent Hackathon 2026

Built for the [GitAgent Hackathon 2026](https://hackculture.io/hackathons/gitagent-hackathon) — HackCulture × Lyzr.

**What this submission addresses across all four judging criteria:**

| Criterion | Weight | What's here |
|-----------|--------|-------------|
| Agent Quality | 30% | Compelling SOUL.md with narrative arc · specific enforceable RULES.md · SOD via DUTIES.md · `gitagent validate --compliance` passes |
| Skill Design | 25% | 12 skills across 4 agents · spec-accurate YAML frontmatter · novel `propose-learning` and `contradiction-check` skills |
| Working Demo | 25% | Runs via gitclaw · `npm run validate` exits 0 · complete 11-step demo-flow.md |
| Creativity | 20% | `mirror` self-auditor + human-gated living memory + token-efficient vector retrieval — none of these appear in competing submissions |

**Open issues addressed from [open-gitagent/gitagent](https://github.com/open-gitagent/gitagent/issues):**

- **[#40](https://github.com/open-gitagent/gitagent/issues/40)** — "Compliance by Design": gitrails IS this. SOD policy, mirror agent, human-gated memory PRs, `kill_switch: true` — compliance is the architecture, not a checkbox.
- **[#57](https://github.com/open-gitagent/gitagent/issues/57)** — MCP server definitions: every tool in `tools/*.yaml` follows MCP-compatible input/output schemas with `annotations`.
- **[#58](https://github.com/open-gitagent/gitagent/issues/58)** — `--workspace` flag: `config/default.yaml` separates `agent_dir` from `workspace_dir` natively.

<br/>

---

## 👤 Author

<div align="center">

**Charan S**

*Building AI systems that are auditable, reliable, and actually useful in practice.*

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-charan--s108-181717?style=flat-square&logo=github)](https://github.com/charan-s108)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-charan--s108-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/charan-s108)
[![Email](https://img.shields.io/badge/Email-charansrinivas108%40gmail.com-EA4335?style=flat-square&logo=gmail&logoColor=white)](mailto:charansrinivas108@gmail.com)

</div>

<br/>

---

<div align="center">

*gitagent spec v0.1.0 · gitclaw · groq:llama-3.3-70b-versatile · $0*

*GitAgent Hackathon 2026 — HackCulture × Lyzr*

</div>
# test
