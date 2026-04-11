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

Apply formula: risk = (0.35 × security_severity) + (0.25 × bug_probability) + (0.20 × complexity_delta) + (0.10 × test_coverage_gap) + (0.10 × documentation_debt). ANY CRITICAL finding overrides to BLOCKED. Thresholds: <0.3 APPROVED, 0.3-0.7 NEEDS_REVIEW, >0.7 BLOCKED. Zero file reads — compute from prior skill outputs only.
