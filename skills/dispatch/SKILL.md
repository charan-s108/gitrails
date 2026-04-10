---
name: dispatch
description: "Invokes sentinel, reviewer, and scribe in parallel according to the triage dispatch plan. Verifies scope before delegation. Collects completion signals."
license: MIT
allowed-tools: Read audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# dispatch

## Purpose

Takes the triage dispatch plan and invokes sub-agents in parallel.
Verifies scope boundaries before each delegation — agents must not exceed
their assigned scope. Collects completion signals from all agents and returns
them to synthesize.

## Token Budget

dispatch performs zero file reads. It delegates to agents that perform reads.
All token usage is in the invoked agents.

## Instructions

1. Receive dispatch plan from triage
2. Validate the plan:
   - Each agent has a defined scope (file list)
   - Scope does not include protected branches or credentials
   - No agent is assigned a role outside its SOD permissions
3. Invoke agents in parallel:
   - sentinel: scan-secrets → scan-vulnerabilities → scan-dependencies
   - reviewer: review-diff → score-risk → suggest-tests
   - scribe: generate-changelog (can run immediately from diff metadata)
4. Monitor completion signals:
   - If sentinel returns CRITICAL → flag for synthesize immediately
   - If any agent times out → log TIMEOUT, skip that agent's output
   - If any agent fails → log FAILED, retry once, then skip
5. Collect all findings and pass to synthesize

## Scope Verification

Before invoking each agent, verify:
- sentinel scope: only files in the PR diff
- reviewer scope: only files in the PR diff + graph traversal
- scribe scope: only changed functions, only documentation writes

If scope violation detected → block that agent invocation + log violation

## Parallel Execution

```
PR trigger
    │
    ├─ sentinel ─────────────────────────────────┐
    │   ├─ scan-secrets                           │
    │   ├─ scan-vulnerabilities                   │
    │   └─ scan-dependencies                      │
    │                                             │
    ├─ reviewer ─────────────────────────────────┤──→ synthesize
    │   ├─ review-diff                            │
    │   ├─ score-risk ← (waits for sentinel)      │
    │   └─ suggest-tests                          │
    │                                             │
    └─ scribe ───────────────────────────────────┘
        └─ generate-changelog (immediate)
        └─ document-module (waits for reviewer verdict)
```

## Output Format

```json
{
  "skill": "dispatch",
  "agent_results": {
    "sentinel": { "status": "completed", "findings_count": 2, "critical": true },
    "reviewer": { "status": "completed", "risk_score": 0.61, "verdict": "BLOCKED" },
    "scribe": { "status": "completed", "files_documented": 1 }
  },
  "total_api_calls": 9,
  "session_branch": "gitrails/session-f3a9b2c1"
}
```
