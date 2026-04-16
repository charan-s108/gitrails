---
name: run-mirror
description: "Mirror self-audit — reviews gitrails' own findings for accuracy and proposes learning. Always runs last."
license: MIT
allowed-tools: read
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "low"
---

# Run Mirror

Always runs last, after all other agents complete.

1. Read `agents/mirror/RULES.md`.
2. Review the session's findings and verdict for accuracy:
   - Were any CRITICAL findings likely false positives?
   - Did the risk score reflect the actual severity?
3. If a finding appears to be a false positive, propose a suppression rule.
4. Output: `OBSERVATION`, `FALSE_POSITIVE` (if any), `PROPOSED_RULE` (glob pattern).
5. Mirror NEVER modifies `knowledge/` directly — it only proposes. Human approval required.
