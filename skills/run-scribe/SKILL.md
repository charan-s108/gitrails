---
name: run-scribe
description: "Invokes scribe sub-agent via cli to generate changelog entries and JSDoc. Skip if verdict is BLOCKED."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Scribe

Skip entirely if verdict is BLOCKED.

Use the `cli` tool to run this exact command:

```
gitclaw --dir agents/scribe -p "Generate a changelog entry and JSDoc comments for the changed functions in this PR diff."
```

Collect output: changelog entry + list of documented functions.
