---
name: run-scribe
description: "Invokes scribe to generate changelog entries and JSDoc for changed functions. Skip if verdict is BLOCKED."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Scribe

Skip entirely if verdict is BLOCKED.
Invoke the scribe sub-agent. Pass list of changed files with public functions.
Collect: changelog entry + list of documented functions.
