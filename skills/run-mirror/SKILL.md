---
name: run-mirror
description: "Invokes mirror sub-agent via cli for post-session self-audit. Always runs last."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Mirror

Always invoke mirror after all other agents complete.

Use the `cli` tool to run this exact command:

```
gitclaw --dir agents/mirror -p "Audit this session for accuracy. Review the security findings and risk score. Propose updates to knowledge/false-positives.md if any findings were wrong."
```

Mirror may propose a PR to `knowledge/false-positives.md`.
Mirror NEVER merges its own PR — human approval required.
