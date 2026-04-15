---
name: run-sentinel
description: "Invokes sentinel sub-agent via cli for deep OWASP A01-A09 security scan and secret detection."
license: MIT
allowed-tools: read cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "high"
---

# Run Sentinel

Use the `cli` tool to run this exact command:

```
gitclaw --dir agents/sentinel -p "Scan the PR diff for OWASP A01-A09 vulnerabilities and hardcoded secrets. Report each finding as: finding_id, severity, owasp, file, line, description."
```

Collect output: list of `{ finding_id, severity, owasp, file, line, description }`.
If any finding has `severity: CRITICAL` → set verdict BLOCKED immediately.
