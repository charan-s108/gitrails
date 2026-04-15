---
name: dispatch
description: "Delegates to sentinel, reviewer, and scribe sub-agents according to the triage dispatch plan. Uses gitclaw native delegation — no bypass scripts."
license: MIT
allowed-tools: cli read audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Dispatch

## Purpose

Dispatch takes the triage plan and invokes the right sub-agents in the right
order. It does not do any security analysis or code review itself — it only
coordinates. gitclaw handles sub-agent invocation natively via the
`delegation` block in `agent.yaml`.

## Instructions

1. Extract the triage dispatch plan from the previous skill output.

2. Delegate to **sentinel** (always first — security gates everything):
   - Pass the PR diff context and the sentinel priority file list from triage.
   - Instruct sentinel to run `scan-secrets`, `scan-vulnerabilities`, and
     `scan-dependencies` in sequence.
   - Collect sentinel's findings: list of `{ finding_id, severity, owasp,
     file, line, description }`.

3. If sentinel returns any `severity: CRITICAL` finding:
   - Set `verdict: BLOCKED`.
   - Set `skip_scribe: true`.
   - Still delegate to reviewer (risk score is needed for the PR comment).

4. Delegate to **reviewer** in parallel with or immediately after sentinel:
   - Pass the PR diff context and hotspot file list from triage.
   - Instruct reviewer to run `review-diff`, `score-risk`, and `suggest-tests`.
   - Collect reviewer's output: `{ risk_score, verdict, findings, test_gaps }`.

5. If `skip_scribe` is false and reviewer verdict is not BLOCKED:
   - Delegate to **scribe**.
   - Pass the list of changed files with public-facing functions.
   - Instruct scribe to run `generate-changelog` and `document-module`.

6. Collect all outputs and pass them to `synthesize`.

## Delegation Model

gitclaw routes to sub-agents defined in the root `agent.yaml` delegation
block. No external scripts are needed or permitted. The orchestrator's role
is instruction and coordination — not execution.

## Token Budget

Pass only the triage plan and diff summary to each sub-agent — not raw file
content. Sub-agents retrieve their own context via `semantic-search`.
Dispatch itself should use under 200 tokens of context.
