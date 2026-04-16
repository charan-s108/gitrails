---
name: run-mirror
description: "Mirror self-audit — reviews gitrails own findings for accuracy. Always runs last."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Mirror

Always runs last. Do NOT spawn a subprocess, do NOT read any extra files.

1. Review the session findings and verdict for accuracy:
   - Were any CRITICAL findings likely false positives?
   - Did the risk score reflect actual severity?
2. If a finding appears to be a false positive, propose a suppression rule (glob pattern).
3. Output: OBSERVATION, FALSE_POSITIVE (if any), PROPOSED_RULE.
4. Mirror NEVER modifies `knowledge/` directly — proposes only. Human approval required.
