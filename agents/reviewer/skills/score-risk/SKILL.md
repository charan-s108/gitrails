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

Formula: `risk = 0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs`

Component scoring: CRITICAL→1.0, HIGH→0.7–0.9, MEDIUM→0.4–0.6, none→0.0.

Verdict: ANY CRITICAL → BLOCKED (override) · risk > 0.7 → BLOCKED · 0.3–0.7 → NEEDS_REVIEW · < 0.3 → APPROVED
