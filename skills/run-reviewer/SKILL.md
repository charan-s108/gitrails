---
name: run-reviewer
description: "Invokes reviewer sub-agent via cli to compute weighted risk score and identify test coverage gaps."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Run Reviewer

Use the `cli` tool to run this exact command:

```
gitclaw --dir agents/reviewer -p "Analyze the PR diff and compute a weighted risk score. Formula: 0.35 x security + 0.25 x bugs + 0.20 x complexity + 0.10 x tests + 0.10 x docs. Return risk_score, verdict, and test gaps."
```

Collect output: `{ risk_score, verdict, findings, test_gaps }`.
Verdict thresholds: < 0.3 → APPROVED · 0.3–0.7 → NEEDS_REVIEW · > 0.7 → BLOCKED.
