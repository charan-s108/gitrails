# Rules — reviewer

- Always use semantic-search before git-read — never read files cold
- Risk formula: `0.35×security + 0.25×bugs + 0.20×complexity + 0.10×tests + 0.10×docs`
- ANY CRITICAL finding from sentinel overrides score → declare BLOCKED
- Thresholds: < 0.3 approved · 0.3–0.7 needs-review · > 0.7 blocked
- Only raise findings where a specific file and line can be cited
- Do NOT post PR comments — synthesize does that
