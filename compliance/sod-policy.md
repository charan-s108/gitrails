# Segregation of Duties Policy

## Overview

gitrails enforces strict segregation of duties (SOD) across all agents.
No agent may hold conflicting roles. Human approval is required for all
irreversible actions (merges, memory updates).

This policy implements "compliance by design" as described in
gitagent/gitagent issue #40.

## Role Definitions

| Role | ID | Description | Permissions |
|------|----|-------------|-------------|
| Analyzer | analyzer | Reads code and produces findings | read, analyze |
| Writer | writer | Writes files and commits changes | write, commit |
| Auditor | auditor | Reviews decisions and proposes updates | audit, propose |
| Approver | approver | Human role — approves PRs and merges | approve, merge |

## Agent Assignments

| Agent | Role | Justification |
|-------|------|---------------|
| sentinel | analyzer | Security scanner — reads only, never writes |
| reviewer | analyzer | Code reviewer — reads only, never writes |
| scribe | writer | Documentation author — writes documentation only |
| mirror | auditor | Self-auditor — proposes only, never commits |
| human | approver | Final authority — merges and memory updates |

## Conflict Rules

The following role combinations are explicitly prohibited:

1. **analyzer + auditor**: An agent that analyzes code cannot audit its own findings
2. **writer + auditor**: An agent that writes code cannot audit the decisions about that code

These conflicts are enforced in `agent.yaml` via the `compliance.prohibited` field
and at runtime by `hooks/scripts/pre-tool-audit.sh`.

## Handoff Requirements

| Action | Required Roles | Human Approval |
|--------|----------------|----------------|
| memory_update | auditor + approver | yes |
| pr_merge | analyzer + approver | yes |
| git_commit | writer | no (session branch only) |
| pr_creation | analyzer + writer | no (draft PR only) |

## Enforcement

1. **Static enforcement**: Each agent's `agent.yaml` declares its role and `prohibited` list
2. **Runtime enforcement**: `pre-tool-audit.sh` blocks tool calls that violate SOD
3. **Audit trail**: All blocked actions are logged to `.gitagent/audit.jsonl`
4. **Kill switch**: `agent.yaml` compliance.supervision.kill_switch: true — human can halt all activity

## Rationale

Separating analysis from writing prevents an agent from silently suppressing
findings it doesn't want to report. Separating auditing from analysis prevents
the agent being audited from influencing its own audit.

The human approver role ensures that no AI agent has unilateral control over
what gitrails learns or what gets merged. Every improvement goes through a PR.
Every PR requires human review.

This is the core trust mechanism of gitrails.
