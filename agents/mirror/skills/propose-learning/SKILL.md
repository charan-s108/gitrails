---
name: propose-learning
description: "Proposes knowledge updates via human-approved PR when over-flagged patterns are detected. Never updates knowledge files directly."
license: MIT
allowed-tools: read write cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "standard"
---

# propose-learning

1. Read `memory/runtime/dailylog.md` — find all over-flagged findings from this session.
2. If zero over-flagged → log "no learning warranted" and exit.
3. Read `knowledge/false-positives.md` — check if a suppression already exists for each pattern.
4. For new patterns only: write the proposed addition to `knowledge/false-positives.md` as a draft.
5. Open a draft PR via `cli` with evidence and rationale. Never merge it — human approval required.
