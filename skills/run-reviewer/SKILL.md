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
