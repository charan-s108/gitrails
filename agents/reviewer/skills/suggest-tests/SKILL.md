---
name: suggest-tests
description: "Identifies changed functions without test coverage and suggests specific test cases. Uses semantic search to find test files and code graph to enumerate changed functions."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "low"
---

# suggest-tests

Get changed functions via graph. For each function, search for existing tests. Mark as UNTESTED if no test file found (score <0.5). Suggest 3-5 specific test cases (happy path, null input, error case, boundary) for each untested function. Return test_coverage_gap score and functions_analyzed list.
