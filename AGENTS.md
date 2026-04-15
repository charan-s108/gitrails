# Agents — gitrails

| Agent | Role | Skills |
|-------|------|--------|
| gitrails | Orchestrator | triage, dispatch, synthesize |
| sentinel | Security scanner (analyzer) | scan-secrets, scan-vulnerabilities, scan-dependencies |
| reviewer | Code quality (analyzer) | review-diff, score-risk, suggest-tests |
| scribe | Documentation (writer) | generate-changelog, document-module |
| mirror | Self-auditor (auditor) | audit-decisions, propose-learning, contradiction-check |

Delegates: gitrails → sentinel, reviewer, scribe, mirror (parallel). mirror runs last.
