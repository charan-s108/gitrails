---
name: suggest-tests
description: "Identifies changed functions without test coverage and suggests specific test cases."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "low"
---

# suggest-tests

1. Read `../../knowledge/graph.json` — get function list for each changed file.
2. For each changed function: check if a `*.test.*` or `*.spec.*` file exists for that module via `cli`.
3. If test file exists: read only the `describe`/`it` block names (first 30 lines of test file).
4. For UNTESTED functions: suggest 3–5 specific test cases covering happy path, null input, error case, boundary.
5. For PARTIALLY TESTED functions: list the specific missing edge cases only.
6. Score `test_coverage_gap` (0.0–1.0): zero tests→0.9, partial→0.5, full→0.0.
7. Pass score to `score-risk`.
