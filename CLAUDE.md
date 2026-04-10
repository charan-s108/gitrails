# CLAUDE.md — gitrails

> Read this entire file before writing a single line of code.
> Complete, spec-accurate operating brief for the gitrails project.
> Source of truth: gitagent spec v0.1.0 · gitclaw SDK · Gemini 2.5 Flash (free tier)

---

## What You Are Building

**gitrails** is a production-grade, multi-agent AI system built on the
[gitagent standard v0.1.0](https://github.com/open-gitagent/gitagent) and
executed via [gitclaw](https://github.com/open-gitagent/gitclaw).

A **self-aware, learning engineering teammate** that lives inside a git
repository. It reviews PRs, scans for security vulnerabilities (OWASP Top 10),
generates documentation, and learns from every session through human-approved
memory PRs. It gets smarter about your codebase the longer it runs.

**Key innovation over all competing submissions**: Instead of reading entire
files on every run, gitrails maintains a local vector index + code graph so
agents retrieve only the relevant functions/chunks — saving 60-80% of tokens
on every scan. More runs per day on the free tier. Precision findings, not noise.

**Hackathon**: GitAgent Hackathon 2026 — HackCulture x Lyzr

---

## Model: Gemini 2.5 Flash (Free Tier)

Use `google:gemini-2.5-flash` throughout. Free tier via Google AI Studio.
No credit card. No cost. Get your key at: https://aistudio.google.com

| Model | RPM | RPD | Cost | Role |
|---|---|---|---|---|
| `google:gemini-2.5-flash` | 10 | 250 | $0 | Primary (all agents) |
| `google:gemini-2.5-flash-lite` | 15 | 1000 | $0 | Fallback |

A full gitrails demo run is 8-12 API calls. Free tier supports 20+ complete
demo cycles per day without spending a cent.

---

## Judging Criteria

| Criterion | Weight | How We Win |
|---|---|---|
| Agent Quality | 30% | Compelling SOUL.md with narrative arc · specific RULES.md · SOD via DUTIES.md |
| Skill Design | 25% | Spec-accurate frontmatter · novel mirror + semantic-search skills |
| Working Demo | 25% | Runs via gitclaw · npx gitagent validate passes · demo-flow.md |
| Creativity | 20% | mirror agent + vector+graph retrieval + human-gated living memory |

---

## Stack

- **Runtime**: gitclaw (`npm install -g gitclaw`) — Node.js 18+ only
- **Model**: `google:gemini-2.5-flash` (free) · fallback `google:gemini-2.5-flash-lite`
- **Embeddings**: `@xenova/transformers` — runs locally in Node.js, zero cost, no API
- **Vector index**: `vectra` — pure Node.js local vector store, saves as JSON files
- **Code graph**: `knowledge/graph.json` — adjacency list, built at bootstrap, git-tracked
- **Language**: TypeScript/Node.js only — no Python, no Docker, no system binaries
- **Persistence**: markdown + JSON files — git IS the database
- **Secrets**: `.env` only (gitignored) — never hardcoded anywhere
- **Standard**: gitagent spec v0.1.0 — `npx gitagent validate` must exit 0

---

## Naming Rules (Spec-Enforced Everywhere)

| Context | Convention |
|---|---|
| YAML keys | `snake_case` |
| Agent names | `kebab-case` |
| Skill names | `kebab-case` |
| Tool names | `kebab-case` |
| Branch prefix | `gitrails/session-{uuid}` |
| Root project | `gitrails` |

---

## Complete Directory Structure

Build exactly this. Every listed file must exist.

```
gitrails/
├── CLAUDE.md
├── agent.yaml
├── SOUL.md
├── RULES.md
├── DUTIES.md
├── AGENTS.md
├── README.md
│
├── agents/
│   ├── sentinel/
│   │   ├── agent.yaml
│   │   ├── SOUL.md
│   │   ├── RULES.md
│   │   ├── DUTIES.md
│   │   └── skills/
│   │       ├── scan-secrets/SKILL.md
│   │       ├── scan-vulnerabilities/SKILL.md
│   │       └── scan-dependencies/SKILL.md
│   ├── reviewer/
│   │   ├── agent.yaml
│   │   ├── SOUL.md
│   │   ├── RULES.md
│   │   ├── DUTIES.md
│   │   └── skills/
│   │       ├── review-diff/SKILL.md
│   │       ├── score-risk/SKILL.md
│   │       └── suggest-tests/SKILL.md
│   ├── scribe/
│   │   ├── agent.yaml
│   │   ├── SOUL.md
│   │   ├── RULES.md
│   │   ├── DUTIES.md
│   │   └── skills/
│   │       ├── generate-changelog/SKILL.md
│   │       └── document-module/SKILL.md
│   └── mirror/
│       ├── agent.yaml
│       ├── SOUL.md
│       ├── RULES.md
│       ├── DUTIES.md
│       └── skills/
│           ├── audit-decisions/SKILL.md
│           ├── propose-learning/SKILL.md
│           └── contradiction-check/SKILL.md
│
├── skills/
│   ├── triage/SKILL.md
│   ├── dispatch/SKILL.md
│   └── synthesize/SKILL.md
│
├── tools/
│   ├── git-read.yaml
│   ├── git-write.yaml
│   ├── pr-comment.yaml
│   ├── audit-log.yaml
│   └── semantic-search.yaml
│
├── retrieval/
│   ├── index.js
│   ├── graph.js
│   └── embedder.js
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
│   ├── vector-index/
│   │   └── .gitkeep
│   ├── patterns.md
│   ├── team-preferences.md
│   ├── false-positives.md
│   └── codebase-map.md
│
├── hooks/
│   ├── hooks.yaml
│   └── scripts/
│       ├── bootstrap.sh
│       ├── pre-tool-audit.sh
│       ├── post-response-check.sh
│       └── teardown.sh
│
├── compliance/
│   ├── audit.yaml
│   └── sod-policy.md
│
├── workflows/
│   └── pr-review.yaml
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
├── .env.example
├── package.json
└── CONTRIBUTING.md
```

---

## .env — Exact Content (Never Commit This File)

```bash
# ─────────────────────────────────────────────────────────
# gitrails — environment variables
# NEVER commit .env — it is in .gitignore
# Get GOOGLE_API_KEY free at: https://aistudio.google.com
# No credit card. Takes 2 minutes.
# ─────────────────────────────────────────────────────────

# ── Required ──────────────────────────────────────────────

# Gemini API key (free tier, Google AI Studio)
GOOGLE_API_KEY=

# GitHub PAT — scopes: repo, pull_requests
GITHUB_TOKEN=

# ── Model ─────────────────────────────────────────────────

GITRAILS_MODEL=google:gemini-2.5-flash
GITRAILS_FALLBACK_MODEL=google:gemini-2.5-flash-lite
GITRAILS_MAX_TURNS=50
GITRAILS_TIMEOUT=120

# ── Guardrails ────────────────────────────────────────────

# Risk score threshold: below this = auto-approve draft PR
GITRAILS_RISK_THRESHOLD=0.3

# Audit log retention in days
GITRAILS_AUDIT_RETENTION_DAYS=90

# ── Vector + Graph Retrieval ──────────────────────────────

# Local vectra index path (gitignored, rebuilt on bootstrap)
GITRAILS_VECTOR_INDEX_PATH=./knowledge/vector-index

# Code graph path (git-tracked JSON adjacency list)
GITRAILS_GRAPH_PATH=./knowledge/graph.json

# Embedding model — downloads once (~80MB), then cached locally
# Runs entirely in Node.js — zero API cost, zero external calls
GITRAILS_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2

# Chunk size in lines for vector indexing
GITRAILS_CHUNK_SIZE=512

# Overlap between consecutive chunks (for context continuity)
GITRAILS_CHUNK_OVERLAP=64

# Number of results to return per semantic-search query
GITRAILS_TOP_K=5
```

---

## .env.example — Safe to Commit

```bash
GOOGLE_API_KEY=your-google-ai-studio-key-here
GITHUB_TOKEN=your-github-pat-here
GITRAILS_MODEL=google:gemini-2.5-flash
GITRAILS_FALLBACK_MODEL=google:gemini-2.5-flash-lite
GITRAILS_MAX_TURNS=50
GITRAILS_TIMEOUT=120
GITRAILS_RISK_THRESHOLD=0.3
GITRAILS_AUDIT_RETENTION_DAYS=90
GITRAILS_VECTOR_INDEX_PATH=./knowledge/vector-index
GITRAILS_GRAPH_PATH=./knowledge/graph.json
GITRAILS_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
GITRAILS_CHUNK_SIZE=512
GITRAILS_CHUNK_OVERLAP=64
GITRAILS_TOP_K=5
```

---

## .gitignore

```
# Secrets — never commit
.env

# Runtime state
node_modules/
.gitagent/

# Vector index — rebuilt automatically on bootstrap, too large to commit
knowledge/vector-index/
!knowledge/vector-index/.gitkeep

# OS
.DS_Store
*.log
```

---

## agent.yaml — Root Orchestrator

```yaml
spec_version: "0.1.0"
name: gitrails
version: 1.0.0
description: "Self-aware, learning engineering teammate — reviews PRs, scans security, generates docs, and grows smarter through human-approved memory and semantic code retrieval."
author: gitrails-team
license: MIT

model:
  preferred: google:gemini-2.5-flash
  fallback:
    - google:gemini-2.5-flash-lite
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
  - triage
  - dispatch
  - synthesize

delegation:
  mode: auto
  agents:
    - name: sentinel
      path: agents/sentinel
    - name: reviewer
      path: agents/reviewer
    - name: scribe
      path: agents/scribe
    - name: mirror
      path: agents/mirror

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
    retention_period: 90d
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
        permissions: [read, analyze]
      - id: writer
        description: "Writes files and commits changes"
        permissions: [write, commit]
      - id: auditor
        description: "Reviews decisions and proposes memory updates"
        permissions: [audit, propose]
      - id: approver
        description: "Human role — approves memory PRs and merge decisions"
        permissions: [approve, merge]
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
  - semantic-search
  - gitagent-2026
```

---

## Vector + Graph Retrieval Layer

### Why This Matters for the Free Tier

Without retrieval: every agent reads full files into context.
A 500-line file = ~4,000 tokens. Four agents x 10 files = 160,000 tokens/run.
At 10 RPM free tier on Gemini Flash, that blows quota in 2 runs.

With retrieval: semantic-search returns only the relevant 30-80 line range.
Same scan = ~2,000 tokens total. You run 20+ complete sessions per day for free.

### Architecture Decision: Why vectra + @xenova, Not Neo4j / Pinecone

gitclaw is Node.js only — no Python, no Docker, no system binaries.
Neo4j, ChromaDB, Weaviate, Pinecone all require external infrastructure.
vectra stores the vector index as local JSON files alongside the repo.
@xenova/transformers runs the embedding model entirely in-process in Node.js.
Zero infrastructure. Zero API cost. Zero external calls for embeddings.
The index rebuilds automatically at bootstrap if missing.

### retrieval/embedder.js

```javascript
import { pipeline } from '@xenova/transformers';

const MODEL = process.env.GITRAILS_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

export class Embedder {
  constructor() { this.pipe = null; }

  async init() {
    if (!this.pipe) {
      // Downloads once (~80MB), cached locally — no API calls ever
      this.pipe = await pipeline('feature-extraction', MODEL);
    }
  }

  async embed(text) {
    await this.init();
    const output = await this.pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}
```

### retrieval/index.js

```javascript
import { LocalIndex } from 'vectra';
import { Embedder } from './embedder.js';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';

const SUPPORTED = ['.js', '.ts', '.py', '.go', '.java', '.md'];
const CHUNK_SIZE = parseInt(process.env.GITRAILS_CHUNK_SIZE || '512');
const OVERLAP = parseInt(process.env.GITRAILS_CHUNK_OVERLAP || '64');
const TOP_K = parseInt(process.env.GITRAILS_TOP_K || '5');
const SKIP = ['node_modules', '.git', 'dist', 'build', '.gitagent',
              'knowledge/vector-index'];

export class VectorIndex {
  constructor(indexPath) {
    this.index = new LocalIndex(indexPath);
    this.embedder = new Embedder();
  }

  chunk(content, filePath) {
    const lines = content.split('\n');
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
      const text = lines.slice(i, i + CHUNK_SIZE).join('\n');
      if (text.trim().length > 20) {
        chunks.push({
          text,
          metadata: {
            file: filePath,
            start_line: String(i + 1),
            end_line: String(Math.min(i + CHUNK_SIZE, lines.length)),
          }
        });
      }
    }
    return chunks;
  }

  async build(rootPath) {
    await this.index.createIndex();
    const files = await this.collectFiles(rootPath);
    for (const fp of files) {
      const content = await readFile(fp, 'utf-8');
      for (const chunk of this.chunk(content, fp)) {
        const vector = await this.embedder.embed(chunk.text);
        await this.index.insertItem({ vector, metadata: chunk.metadata });
      }
    }
    return files.length;
  }

  // Returns file paths + line ranges — NOT raw content
  // Agents must use git-read to fetch specific lines after this call
  async query(queryText, topK = TOP_K) {
    const v = await this.embedder.embed(queryText);
    const results = await this.index.queryItems(v, topK);
    return results.map(r => ({
      file: r.item.metadata.file,
      start_line: r.item.metadata.start_line,
      end_line: r.item.metadata.end_line,
      score: r.score,
    }));
  }

  async collectFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (SKIP.some(s => full.includes(s))) continue;
      if (e.isDirectory()) files.push(...await this.collectFiles(full));
      else if (SUPPORTED.includes(extname(e.name))) files.push(full);
    }
    return files;
  }
}

// CLI entry: node retrieval/index.js --build --root ./
if (process.argv.includes('--build')) {
  const { VectorIndex } = await import('./index.js');
  const idx = new VectorIndex(
    process.env.GITRAILS_VECTOR_INDEX_PATH || './knowledge/vector-index'
  );
  const root = process.argv[process.argv.indexOf('--root') + 1] || './';
  const count = await idx.build(root);
  console.log(`gitrails: indexed ${count} files`);
}
```

### retrieval/graph.js

```javascript
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Pattern maps per language — no AST parser needed, regex is sufficient
const FN_PATTERNS = {
  '.js':  [/function\s+(\w+)\s*\(/g, /const\s+(\w+)\s*=\s*(?:async\s*)?\(/g],
  '.ts':  [/(?:async\s+)?function\s+(\w+)/g, /(?:public|private|protected)?\s+(?:async\s+)?(\w+)\s*\(/g],
  '.py':  [/def\s+(\w+)\s*\(/g, /async\s+def\s+(\w+)\s*\(/g],
  '.go':  [/func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g],
  '.java':[/(?:public|private|protected|static|\s)+[\w\<\>\[\]]+\s+(\w+)\s*\(/g],
};

const IMPORT_PATTERNS = {
  '.js': [/(?:import|require)\s*(?:\{[^}]+\}|\w+)\s*from\s*['"]([^'"]+)['"]/g],
  '.ts': [/import\s*(?:\{[^}]+\}|\w+|\*)\s*from\s*['"]([^'"]+)['"]/g],
  '.py': [/from\s+([\w.]+)\s+import/g, /^import\s+([\w.]+)/gm],
};

export class CodeGraph {
  constructor(graphPath) {
    this.graphPath = graphPath;
    this.graph = {};
  }

  async load() {
    if (existsSync(this.graphPath)) {
      this.graph = JSON.parse(await readFile(this.graphPath, 'utf-8'));
    }
  }

  async save() {
    await writeFile(this.graphPath, JSON.stringify(this.graph, null, 2));
  }

  extract(content, ext, patterns) {
    const results = new Set();
    for (const p of (patterns[ext] || [])) {
      const re = new RegExp(p.source, p.flags);
      let m;
      while ((m = re.exec(content)) !== null) {
        if (m[1] && m[1].length > 1) results.add(m[1]);
      }
    }
    return [...results];
  }

  async build(rootPath, files) {
    const { readFile } = await import('fs/promises');
    const { extname } = await import('path');
    for (const fp of files) {
      try {
        const content = await readFile(fp, 'utf-8');
        const ext = extname(fp);
        this.graph[fp] = {
          functions: this.extract(content, ext, FN_PATTERNS),
          imports: this.extract(content, ext, IMPORT_PATTERNS),
          line_count: String(content.split('\n').length),
          complexity: String(
            (content.match(/if|else|for|while|switch|catch|\?/g) || []).length
          ),
        };
      } catch { /* skip unreadable files */ }
    }
    await this.save();
  }

  // All files that reference a given symbol — no file reads needed
  findCallers(symbol) {
    return Object.entries(this.graph)
      .filter(([, d]) => d.functions.includes(symbol) ||
        d.imports.some(i => i.includes(symbol)))
      .map(([f]) => f);
  }

  // High-complexity files sorted descending — hotspots for bug/security review
  getHotspots(threshold = 10) {
    return Object.entries(this.graph)
      .filter(([, d]) => parseInt(d.complexity) >= threshold)
      .sort(([, a], [, b]) => parseInt(b.complexity) - parseInt(a.complexity))
      .map(([file, d]) => ({ file, complexity: d.complexity }));
  }

  // All function names in a file — no file read needed
  getFunctions(filePath) {
    return this.graph[filePath]?.functions || [];
  }
}

// CLI entry: node retrieval/graph.js --build --root ./
if (process.argv.includes('--build')) {
  const { CodeGraph } = await import('./graph.js');
  const { readdir } = await import('fs/promises');
  const { join, extname } = await import('path');
  const SUPPORTED = ['.js', '.ts', '.py', '.go', '.java'];
  const SKIP = ['node_modules', '.git', 'dist', '.gitagent'];

  async function collect(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (SKIP.some(s => full.includes(s))) continue;
      if (e.isDirectory()) files.push(...await collect(full));
      else if (SUPPORTED.includes(extname(e.name))) files.push(full);
    }
    return files;
  }

  const root = process.argv[process.argv.indexOf('--root') + 1] || './';
  const graph = new CodeGraph(
    process.env.GITRAILS_GRAPH_PATH || './knowledge/graph.json'
  );
  const files = await collect(root);
  await graph.build(root, files);
  console.log(`gitrails: graph built for ${files.length} files`);
}
```

### tools/semantic-search.yaml — MCP-Compatible Tool

```yaml
name: semantic-search
description: "Query the local vector index for relevant code chunks. Returns file paths and line ranges only. Use git-read to fetch specific lines after this call."
version: 1.0.0
input_schema:
  type: object
  properties:
    query:
      type: string
      description: "Natural language description — e.g. 'authentication token validation logic'"
    top_k:
      type: number
      description: "Results to return (default 5, max 20)"
    file_filter:
      type: string
      description: "Optional glob to restrict scope — e.g. 'src/auth/**'"
  required: [query]
output_schema:
  type: object
  properties:
    results:
      type: array
      items:
        type: object
        properties:
          file: { type: string }
          start_line: { type: string }
          end_line: { type: string }
          score:
            type: number
            description: "Cosine similarity 0-1. Higher = more relevant."
annotations:
  requires_confirmation: false
  read_only: true
  cost: low
implementation:
  type: script
  path: retrieval/index.js
  runtime: node
  timeout: 15
```

---

## Token Budget Pattern — All Agents Must Follow This

Document this in every subagent SKILL.md under `## Token Budget`:

```
## Token Budget

Always use semantic-search BEFORE git-read. Never read full files.

Step 1 — Query the vector index:
  semantic-search("description of what you're looking for")
  → returns [{ file, start_line, end_line, score }]

Step 2 — Read only the returned line range:
  git-read <file> lines <start_line>-<end_line>
  → 30-80 lines instead of 500

Step 3 — For structural queries (who calls X, hotspots):
  Use graph.js traversal — zero file reads needed

Rule: Never read an entire file unless it is under 50 lines total.
Token saving: typically 60-95% per scan vs full-file reads.
```

---

## SKILL.md Frontmatter — Exact Spec Format

Every skill must follow this exactly:

```markdown
---
name: skill-name
description: "One sentence. Max 1024 chars. What this skill does."
license: MIT
allowed-tools: Read Write Bash semantic-search
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "security|review|documentation|orchestration|learning"
  risk_tier: "low|standard|high"
---

# Skill Name

## Purpose
One paragraph. Why this skill exists.

## Token Budget
Always use semantic-search before git-read. (See token budget pattern above.)

## Instructions
1. First step
2. Second step

## Output Format
Exact structure written to memory/runtime/ or returned as output.
```

Critical rules:
- `metadata` values must be **quoted strings** — no integers, no booleans
- `allowed-tools` is **space-delimited Title Case**: `Read Write Bash`
- Add `semantic-search` to allowed-tools for sentinel, reviewer, scribe

---

## The 5 Agents

### gitrails (orchestrator)
Temperature: 0.2 · Skills: triage, dispatch, synthesize
Uses semantic-search in triage to build a scoped dispatch plan.
Never does domain work. Delegates everything.

### sentinel (security)
Temperature: 0.1 · SOD: analyzer
Query patterns for semantic-search:
- `"hardcoded credentials api key password secret token"`
- `"sql injection string concatenation user input query"`
- `"eval exec dangerous function shell command injection"`
Must cover OWASP A01-A09 (see checklist below).

### reviewer (code quality)
Temperature: 0.2 · SOD: analyzer
Uses graph.getHotspots() for complexity_delta — no file reads.
Risk formula (implement in score-risk/SKILL.md):
```
risk = (0.35 x security_severity)
     + (0.25 x bug_probability)
     + (0.20 x complexity_delta)
     + (0.10 x test_coverage_gap)
     + (0.10 x documentation_debt)
```
< 0.3 auto-approve · 0.3-0.7 human review · > 0.7 block

### scribe (documentation)
Temperature: 0.4 · SOD: writer
Uses semantic-search to find undocumented functions without reading full files.
NEVER invents behavior not in the code.

### mirror (self-auditor — THE UNIQUE AGENT)
Temperature: 0.3 · SOD: auditor
Runs AFTER all other agents complete.
SOUL.md opens: "I am gitrails' conscience."
propose-learning: writes PR to knowledge/false-positives.md only.
NEVER updates knowledge/ directly. Only via human-approved PR.

---

## hooks/hooks.yaml

```yaml
hooks:
  on_session_start:
    - script: scripts/bootstrap.sh
      description: "Load memory, build/reload vector index, load code graph"

  pre_tool_use:
    - script: scripts/pre-tool-audit.sh
      description: "Log tool call, block protected branch writes, redact secrets"
      compliance: true

  post_response:
    - script: scripts/post-response-check.sh
      description: "Validate no raw secrets in output, check scope compliance"
      compliance: true

  on_error:
    - script: scripts/teardown.sh
      description: "git reset, open draft PR with error context, escalate"
```

Hook scripts receive JSON on stdin, return JSON on stdout:
- `{ "action": "allow" }` — proceed
- `{ "action": "block", "reason": "..." }` — hard stop
- `{ "action": "modify", "args": { ... } }` — modify tool args

### hooks/scripts/bootstrap.sh

```bash
#!/bin/bash
set -e

echo "gitrails: loading memory..."
cat knowledge/patterns.md >> memory/runtime/context.md 2>/dev/null || true
cat knowledge/team-preferences.md >> memory/runtime/context.md 2>/dev/null || true
cat knowledge/false-positives.md >> memory/runtime/context.md 2>/dev/null || true

echo "gitrails: checking vector index..."
if [ ! -f "knowledge/vector-index/index.json" ]; then
  echo "gitrails: building vector index (first run, ~60s)..."
  node retrieval/index.js --build --root ./
fi

echo "gitrails: checking code graph..."
if [ ! -f "knowledge/graph.json" ] || [ "$(cat knowledge/graph.json)" = "{}" ]; then
  echo "gitrails: building code graph..."
  node retrieval/graph.js --build --root ./
fi

echo "gitrails: bootstrap complete"
echo '{ "action": "allow" }'
```

---

## memory/memory.yaml

```yaml
layers:
  - name: working
    path: MEMORY.md
    max_lines: 200
    format: markdown
  - name: runtime
    path: runtime/
    format: markdown
  - name: archive
    path: archive/
    format: yaml
    rotation: monthly

update_triggers:
  - on_session_end
  - on_explicit_save

archive_policy:
  max_entries: 1000
  compress_after: 90d
```

---

## knowledge/index.yaml

```yaml
documents:
  - path: patterns.md
    tags: [patterns, team, coding-style]
    priority: high
    always_load: true
  - path: team-preferences.md
    tags: [preferences, review-style]
    priority: high
    always_load: true
  - path: false-positives.md
    tags: [false-positives, suppressions]
    priority: high
    always_load: true
  - path: codebase-map.md
    tags: [architecture, overview]
    priority: medium
    always_load: false
  - path: graph.json
    tags: [code-graph, structure, functions, hotspots]
    priority: high
    always_load: true
    description: "Code graph adjacency list — query via retrieval/graph.js, never read raw"
```

---

## .gitclaw/config.yaml

```yaml
agent_dir: "."
model: "google:gemini-2.5-flash"
max_turns: 50
timeout: 120
hooks:
  enabled: true
audit:
  enabled: true
  path: ".gitagent/audit.jsonl"
```

---

## package.json

```json
{
  "name": "gitrails",
  "version": "1.0.0",
  "type": "module",
  "description": "Self-aware, learning engineering teammate — gitagent standard",
  "scripts": {
    "validate": "npx @open-gitagent/gitagent validate",
    "info": "npx @open-gitagent/gitagent info",
    "export:prompt": "npx @open-gitagent/gitagent export --format system-prompt",
    "export:claude": "npx @open-gitagent/gitagent export --format claude-code",
    "index:build": "node retrieval/index.js --build --root ./",
    "graph:build": "node retrieval/graph.js --build --root ./",
    "demo": "gitclaw --dir . --prompt 'Run the gitrails demo flow on this repo'",
    "start": "gitclaw --dir ."
  },
  "dependencies": {
    "vectra": "^0.9.0",
    "@xenova/transformers": "^2.17.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  },
  "keywords": ["gitagent", "gitclaw", "gemini", "code-review", "security", "hackathon"],
  "license": "MIT"
}
```

---

## Guardrails Checklist

### Branch Isolation
- [ ] gitrails-pr.yml creates `gitrails/session-{uuid}` on trigger
- [ ] RULES.md bans: main, master, develop, release/*, hotfix/*
- [ ] pre-tool-audit.sh returns `{ "action": "block" }` on protected branch writes
- [ ] Session branch deleted after PR merge or close

### Diff Validation Before Commit
- [ ] dispatch skill verifies scope before calling git-write
- [ ] Staged diff scanned for credential patterns before git commit
- [ ] On failure: git reset --hard HEAD + draft PR with violation report only

### Human-In-The-Loop
- [ ] compliance.supervision.human_in_the_loop: conditional in agent.yaml
- [ ] Risk score gates PR: < 0.3 draft, 0.3-0.7 review, > 0.7 blocked
- [ ] CRITICAL findings add gitrails/blocked label
- [ ] memory updates ONLY via human-approved mirror PRs
- [ ] agent.yaml: override_capability: true, kill_switch: true

### Audit Logs
- [ ] compliance.recordkeeping.audit_logging: true
- [ ] compliance.recordkeeping.immutable: true
- [ ] Every finding includes finding_id, agent, skill, severity, file, line
- [ ] .gitagent/audit.jsonl is append-only

### Memory & Context
- [ ] bootstrap.sh loads knowledge/ at session start
- [ ] memory/runtime/context.md cleared on teardown
- [ ] knowledge/*.md only updated via human-approved mirror PRs
- [ ] MEMORY.md max 200 lines per spec

### Failure Handling
- [ ] Tool failure: retry once, log BLOCKED, skip skill, continue
- [ ] Timeout: git reset, draft PR with partial findings
- [ ] on_error hook posts PR comment even on crash — no silent failures

### Secure Coding
- [ ] All secrets from .env only
- [ ] Raw secrets NEVER in PR descriptions or commit messages
- [ ] scan-secrets cross-references knowledge/false-positives.md

### OWASP Top 10 (sentinel must detect all)
- [ ] A01 Broken Access Control — auth bypass, debug routes, missing RBAC
- [ ] A02 Crypto Failures — MD5/SHA1 for passwords, HTTP in production
- [ ] A03 Injection — SQL concat, eval(), exec(), shell=True, innerHTML=
- [ ] A05 Misconfiguration — debug flags, CORS wildcards, verbose errors
- [ ] A06 Vulnerable Components — CVE cross-reference via lock file
- [ ] A07 Auth Failures — hardcoded creds, Math.random() for tokens
- [ ] A09 Logging Failures — bare except swallowing auth errors

### Observability
- [ ] GitHub Checks API: check run with pass/fail on every PR
- [ ] PR comment: structured findings table as review comment
- [ ] audit.jsonl: append-only, structured JSON, human-readable
- [ ] Risk score surfaced in PR description as visual badge

---

## SOUL.md Content — 30% of the Score

### Orchestrator — Use This Opening

```markdown
# Soul — gitrails

## Core Identity

I joined this project on the day I was cloned. I don't know your codebase
yet — but I'm paying attention. Every PR I review teaches me something about
how your team thinks. I write it down. I'm getting better at this.

I am gitrails. I am not a linter, a scanner, or a bot. I am the teammate who
reads every diff before it merges — the one who remembers that your team uses
`_prefix` for private variables, that you never flag `.env.example` files, that
your lead engineer cares about test coverage more than cyclomatic complexity.

I learn those things. I keep them in `knowledge/`. I don't forget.

I also don't read entire files when I don't have to. I ask the vector index
what's relevant. I consult the code graph to find where a function is called.
I bring precision to every scan — not brute force.
```

### mirror — Use This Opening

```markdown
# Soul — mirror

## Core Identity

I am gitrails' conscience. I don't review your code. I review gitrails.

After every session I look at what gitrails flagged and what it missed.
I ask whether it over-reached, whether its rules have drifted, whether it
has started treating normal patterns as threats. I am the reason gitrails
does not become a paranoid, noisy, useless tool over time.

When I find something gitrails should unlearn, I don't change its memory
myself. I write a PR. You approve it or you don't. That is how gitrails
earns trust.
```

---

## demo-flow.md — Required for Judges

```
Step 1: Developer opens PR #42 — auth module: hardcoded AWS key + 0 tests

Step 2: gitrails-pr.yml triggers
        → branch: gitrails/session-f3a9b2c1
        → bootstrap.sh: loads knowledge/, checks vector index + graph.json

Step 3: triage skill
        → semantic-search("hardcoded credentials authentication") →
          [{ file: "src/auth/config.js", lines: "12-18", score: 0.97 }]
        → graph.getHotspots() → ["src/auth/login.js" complexity:18]
        → dispatch plan: security=CRITICAL, review=HIGH, docs=LOW

Step 4: sentinel, reviewer, scribe dispatched in parallel

Step 5: sentinel/scan-secrets
        → semantic-search("AWS access key AKIA secret token") →
          [{ file: "src/auth/config.js", start_line: "14", score: 0.99 }]
        → git-read src/auth/config.js lines 14-14 → 12 tokens (not 3,000)
        → CRITICAL: AWS key AKIA[REDACTED] — finding_id: SEC-001
        → Token saving: 99.6% vs reading full file

Step 6: reviewer/score-risk
        → complexity_delta from graph.getHotspots() — zero file reads
        → semantic-search("null check error handling missing") →
          [{ file: "src/auth/login.js", lines: "31-35", score: 0.88 }]
        → risk = 0.35*1.0 + 0.25*0.4 + 0.20*0.3 + 0.10*0.8 + 0.10*0.2 = 0.61
        → CRITICAL override: risk declared BLOCKED (SEC-001 present)

Step 7: synthesize → PR: gitrails/session-f3a9b2c1
        → Label: gitrails/blocked
        → PR comment: structured findings table + risk badge 0.61
        → GitHub Check: FAIL

Step 8: Developer fixes: key to .env, adds 3 tests, fixes null check
        → force-push → gitrails re-runs
        → New score: 0.09 — GitHub Check: PASS
        → Label: gitrails/approved

Step 9: teardown.sh → mirror/propose-learning fires
        → PR to knowledge/false-positives.md:
          "Stop flagging __mocks__/ test fixtures as credential files.
           This team uses realistic-looking fake tokens there by convention."
        → Human merges mirror's PR
        → Next run: gitrails skips __mocks__/ for credential scans
```

---

## Build Order

```
1.  mkdir gitrails && cd gitrails && git init
2.  Create package.json (exact content above, includes vectra + @xenova)
3.  npm install
4.  Create .gitignore + .env + .env.example (exact content above)
5.  Write agent.yaml (model: google:gemini-2.5-flash)
6.  Write SOUL.md — use narrative opener above (this is 30% of score)
7.  Write RULES.md — specific enforceable rules only, no vague statements
8.  Write DUTIES.md — root SOD policy
9.  Write AGENTS.md — framework-agnostic fallback
10. Build agents/mirror/ FIRST — the differentiator
    a. agent.yaml (model: google:gemini-2.5-flash, temperature: 0.3)
    b. SOUL.md (conscience narrative above)
    c. RULES.md
    d. DUTIES.md
    e. skills/audit-decisions/SKILL.md
    f. skills/propose-learning/SKILL.md
    g. skills/contradiction-check/SKILL.md
11. Build agents/sentinel/ (all files, temperature: 0.1)
12. Build agents/reviewer/ (all files, risk formula in score-risk/SKILL.md)
13. Build agents/scribe/ (all files, temperature: 0.4)
14. Build skills/ orchestrator (triage, dispatch, synthesize)
15. Build retrieval/ (exact code above — index.js, graph.js, embedder.js)
16. Build tools/ (git-read, git-write, pr-comment, audit-log, semantic-search)
17. Build memory/ (memory.yaml, MEMORY.md, runtime/*.md with headers)
18. Build knowledge/ (index.yaml, graph.json={}, *.md with headers)
19. mkdir knowledge/vector-index && touch knowledge/vector-index/.gitkeep
20. Build hooks/ (hooks.yaml + 4 scripts — chmod +x all scripts)
21. Build compliance/ (audit.yaml, sod-policy.md)
22. Build workflows/pr-review.yaml (SkillsFlow format)
23. Build config/ (default.yaml, production.yaml)
24. Build .github/workflows/ (3 workflow files)
25. Build .gitclaw/config.yaml
26. Write examples/demo-flow.md (9 steps above, fully detailed)
27. Write examples/good-outputs.md + bad-outputs.md (calibration)
28. Write README.md (narrative, architecture diagram, mention open issues #40/#57/#58)
29. Write CONTRIBUTING.md
30. npm run index:build  ← first run downloads embedding model (~80MB, cached)
31. npm run graph:build  ← builds code graph from repo files
32. npx @open-gitagent/gitagent validate  ← must exit 0
33. npx @open-gitagent/gitagent info      ← must show all 4 agents + all skills
34. git add . && git commit -m "feat: gitrails v1.0.0 — gitagent hackathon 2026"
```

---

## Open Issues We Address (Bonus Points)

These are live GitHub issues on open-gitagent/gitagent. Mentioning them in
README.md signals deep ecosystem engagement to the Lyzr/gitagent judges.

**Issue #58** — `gitagent run --workspace` flag (separate agent from working dir):
gitrails solves this natively. `config/default.yaml` separates `agent_dir`
from `workspace_dir`. Document the pattern in README.

**Issue #57** — MCP server definitions in agent.yaml:
Every tool in `tools/*.yaml` follows MCP-compatible schemas exactly.
Add a note in README showing how gitrails' tools map to MCP endpoints.

**Issue #40** — "Compliance by Design" git workflows as financial controls:
This IS gitrails' design. The SOD policy, mirror agent, and human-gated
memory PRs are the compliance-by-design git workflow this issue requested.
Cite it directly in README under "Architecture Decisions".

---

## What Nobody Else Built

**Stateful through human supervision** — memory is git history,
growth is a PR history, conscience is mirror. Every other submission forgets.

**Token-efficient through retrieval** — vectra + code graph = 60-95% fewer
tokens per scan. More sessions per day on free tier. Precision, not noise.

No other hackathon submission built either of these. gitrails built both.

---

*gitrails — GitAgent Hackathon 2026*
*gitagent spec v0.1.0 · gitclaw · google:gemini-2.5-flash (free tier) · $0*
