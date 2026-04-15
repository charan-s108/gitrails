---
name: run-sentinel
description: "Invokes sentinel to perform deep OWASP A01-A09 security scan and secret detection on the PR diff."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "high"
---

# Run Sentinel

Invoke the sentinel sub-agent. Pass the PR diff context and file list.
Collect: list of `{ finding_id, severity, owasp, file, line, description }`.
If any finding has `severity: CRITICAL` → set verdict BLOCKED immediately.
