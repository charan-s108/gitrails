---
name: score-risk
description: "Computes a weighted risk score (0.0-1.0) from security severity, bug probability, complexity delta, test coverage gap, and documentation debt. Determines PR gate verdict."
license: MIT
allowed-tools: Read audit-log
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "standard"
---

# score-risk

## Purpose

Synthesizes all reviewer and sentinel findings into a single risk score that
determines the PR gate verdict. Uses the exact weighted formula specified in
the gitrails design. No file reads required — inputs come from prior skills.

## Token Budget

score-risk performs no file reads. It computes from prior skill outputs.

Input sources (all already in context):
- sentinel findings → security_severity component
- review-diff findings → bug_probability + complexity_delta components
- suggest-tests output → test_coverage_gap component
- diff metadata → documentation_debt component

Rule: Zero file reads in this skill. Pure computation from prior outputs.

## Risk Formula

```
risk = (0.35 × security_severity)
     + (0.25 × bug_probability)
     + (0.20 × complexity_delta)
     + (0.10 × test_coverage_gap)
     + (0.10 × documentation_debt)
```

## Component Scoring

### security_severity (0.0–1.0)
From sentinel findings:
- CRITICAL finding present → 1.0 (triggers BLOCKED override regardless of total score)
- HIGH findings only → 0.7–0.9
- MEDIUM findings only → 0.4–0.6
- LOW findings only → 0.1–0.3
- No findings → 0.0

### bug_probability (0.0–1.0)
From review-diff findings:
- Multiple HIGH severity bugs → 0.8–1.0
- One HIGH severity bug → 0.5–0.7
- MEDIUM bugs only → 0.3–0.5
- LOW bugs only → 0.1–0.3
- No bugs → 0.0

### complexity_delta (0.0–1.0)
From graph.getHotspots() and diff analysis:
- File already at hotspot threshold (≥10) AND complexity increased → 0.7–1.0
- New complexity added to non-hotspot file → 0.3–0.5
- Complexity reduced or neutral → 0.0–0.2

### test_coverage_gap (0.0–1.0)
From suggest-tests:
- Changed functions with zero tests → 0.8–1.0
- Changed functions with partial tests → 0.4–0.7
- All changed functions have tests → 0.0–0.2

### documentation_debt (0.0–1.0)
From diff metadata:
- New public API without docs → 0.7–1.0
- Existing undocumented functions changed → 0.3–0.6
- All changed public functions documented → 0.0

## Instructions

1. Collect all component scores from prior skill outputs
2. Apply the formula to compute `total_risk` (round to 2 decimal places)
3. Check for CRITICAL override:
   - If sentinel has ANY CRITICAL finding → verdict = BLOCKED (override)
4. Otherwise apply thresholds:
   - total_risk < 0.3 → verdict = APPROVED
   - 0.3 ≤ total_risk ≤ 0.7 → verdict = REVIEW
   - total_risk > 0.7 → verdict = BLOCKED
5. Return full score breakdown + verdict

## Output Format

```json
{
  "skill": "score-risk",
  "agent": "reviewer",
  "risk_score": 0.61,
  "components": {
    "security_severity": { "score": 0.85, "weight": 0.35, "weighted": 0.30 },
    "bug_probability": { "score": 0.40, "weight": 0.25, "weighted": 0.10 },
    "complexity_delta": { "score": 0.30, "weight": 0.20, "weighted": 0.06 },
    "test_coverage_gap": { "score": 0.80, "weight": 0.10, "weighted": 0.08 },
    "documentation_debt": { "score": 0.20, "weight": 0.10, "weighted": 0.02 }
  },
  "verdict": "BLOCKED",
  "critical_override": true,
  "override_reason": "SEC-f3a9-001: CRITICAL hardcoded AWS key detected",
  "pr_label": "gitrails/blocked",
  "github_check": "FAIL"
}
```
