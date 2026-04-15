---
name: score-risk
description: "Computes weighted risk score (0.0–1.0) from sentinel and review-diff findings. Determines PR gate verdict."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "standard"
---

# score-risk

No file reads — pure computation from prior skill outputs already in context.

## Formula

```
risk = (0.35 × security_severity)
     + (0.25 × bug_probability)
     + (0.20 × complexity_delta)
     + (0.10 × test_coverage_gap)
     + (0.10 × documentation_debt)
```

## Component Scoring

- `security_severity`: CRITICAL→1.0, HIGH→0.7–0.9, MEDIUM→0.4–0.6, none→0.0
- `bug_probability`: multiple HIGH→0.8–1.0, one HIGH→0.5–0.7, MEDIUM→0.3–0.5, none→0.0
- `complexity_delta`: hotspot file complexity increased→0.7–1.0, neutral→0.0–0.2
- `test_coverage_gap`: zero tests on changed functions→0.8–1.0, all tested→0.0
- `documentation_debt`: new public API undocumented→0.7–1.0, all documented→0.0

## Verdict

1. ANY CRITICAL finding from sentinel → BLOCKED (override, score ignored).
2. `risk < 0.3` → APPROVED
3. `0.3 ≤ risk ≤ 0.7` → NEEDS_REVIEW
4. `risk > 0.7` → BLOCKED
