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
