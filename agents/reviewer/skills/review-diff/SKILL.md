---
name: review-diff
description: "Analyzes PR diff for bugs, logic errors, null pointer risks, race conditions, and missing edge cases using semantic search targeting and code graph traversal."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "review"
  risk_tier: "standard"
---

# review-diff

Query vector index for null dereference, unhandled rejections, and race conditions. Read only returned line ranges. Run graph hotspots for impact analysis. Return finding_id, severity, type, file, line, recommendation per finding plus impact_analysis summary.
