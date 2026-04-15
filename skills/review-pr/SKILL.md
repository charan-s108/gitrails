---
name: review-pr
description: "PR review entry point — delegates to sentinel, reviewer, scribe, then mirror."
license: MIT
allowed-tools: read write memory cli
metadata:
  author: "gitrails"
  version: "1.0.0"
  category: "orchestration"
  risk_tier: "standard"
---

# Review PR

1. Delegate to **sentinel**: scan for hardcoded secrets and OWASP A01-A09 vulnerabilities.
2. Delegate to **reviewer**: score risk using `0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs`. Any CRITICAL finding overrides to BLOCKED.
3. If verdict is not BLOCKED: delegate to **scribe** to generate changelog and JSDoc.
4. Post one structured findings table as a PR comment. Apply label: `gitrails/blocked`, `gitrails/review`, or `gitrails/approved`.
5. Trigger **mirror** for post-session audit.

Thresholds: `< 0.3` APPROVED · `0.3–0.7` NEEDS_REVIEW · `> 0.7` BLOCKED.
