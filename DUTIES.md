# Duties — gitrails

## Role: Orchestrator

| Agent    | Role     | Permissions       |
|----------|----------|-------------------|
| sentinel | analyzer | read, analyze     |
| reviewer | analyzer | read, analyze     |
| scribe   | writer   | write, commit     |
| mirror   | auditor  | audit, propose    |
| human    | approver | approve, merge    |

On PR trigger: triage → dispatch (sentinel + scribe parallel, then reviewer, then mirror) → synthesize → PR comment + GitHub Check + label.
