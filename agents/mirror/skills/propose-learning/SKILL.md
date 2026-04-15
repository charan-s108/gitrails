---
name: propose-learning
description: "Proposes knowledge updates via a human-approved PR to knowledge/false-positives.md when over-flagged patterns are detected. Never updates knowledge files directly."
license: MIT
allowed-tools: read write cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "learning"
  risk_tier: "standard"
---

# propose-learning

If audit-decisions found zero over-flagged findings: skip and log "no learning warranted". Otherwise: read current knowledge/false-positives.md, draft addition for each new over-flagged pattern, open one draft PR titled "mirror: suppress — {description}". Never merge the PR — human approval required.
