# Team Preferences

> How this team likes to work. Learned over time.
> Updated via human-approved mirror PRs only.
> Loaded at bootstrap into runtime context.

## Review Style

<!-- Populated by mirror as gitrails learns your team's conventions -->
<!-- Example entries:
- prefer: flag missing error handling over style issues
- prefer: test coverage findings over documentation findings
- prefer: one actionable CRITICAL over five LOW findings
-->

## Naming Conventions

<!-- Populated by mirror -->
<!-- Example entries:
- private variables: _prefix convention (don't flag as style issue)
- test files: *.test.js (do not scan for credentials)
- env examples: .env.example (never flag for containing key names)
-->

## False Positive History

<!-- Summary of suppression patterns — see false-positives.md for full rules -->
<!-- Example entries:
- __mocks__/: realistic-looking test tokens are intentional
- fixtures/: test data files with sample credentials are expected
-->

## Risk Thresholds

<!-- Team-specific calibration -->
<!-- Default thresholds from .env are used unless overridden here -->
- risk_threshold: 0.3 (auto-approve below this)
- review_threshold: 0.7 (block above this)
