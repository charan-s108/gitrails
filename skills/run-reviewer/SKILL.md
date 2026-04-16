---
name: run-reviewer
description: "Reviewer risk scoring — computes weighted risk score from the diff inline."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Run Reviewer

Only runs if sentinel found NO critical findings. Do NOT spawn a subprocess, do NOT read any extra files.

1. Score the diff:
   - `security_severity` (0–1): based on sentinel finding count and severity
   - `bug_probability` (0–1): null dereferences, unhandled exceptions
   - `complexity_delta` (0–1): new branches, large functions
   - `test_coverage_gap` (0–1): changed functions with no visible tests
   - `documentation_debt` (0–1): public functions with no JSDoc
2. Risk = `0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs`
3. Verdict: < 0.3 → APPROVED · 0.3–0.7 → NEEDS_REVIEW · > 0.7 → BLOCKED
4. List top 3 quality issues with file:line references.
