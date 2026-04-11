# Agents — gitrails

Framework-agnostic agent registry. Lists all agents, their roles, skills,
and delegation relationships. Used as fallback when agent.yaml is not parsed.

---

## gitrails (orchestrator)

**Path**: `.` (root)
**Model**: ${GITRAILS_MODEL}
**Temperature**: 0.2
**Role**: Orchestrator — coordinates all sub-agents, never does domain work

**Skills**:
- `triage` — semantic-search-driven dispatch planning
- `dispatch` — parallel agent invocation
- `synthesize` — findings aggregation + risk scoring

**Delegates to**: sentinel, reviewer, scribe, mirror

---

## sentinel

**Path**: `agents/sentinel/`
**Model**: ${GITRAILS_MODEL}
**Temperature**: 0.1
**Role**: Security scanner (SOD: analyzer)

**Skills**:
- `scan-secrets` — finds hardcoded credentials, API keys, tokens
- `scan-vulnerabilities` — OWASP A01-A09 detection
- `scan-dependencies` — CVE cross-reference via lock files

**Key queries for semantic-search**:
- `"hardcoded credentials api key password secret token"`
- `"sql injection string concatenation user input query"`
- `"eval exec dangerous function shell command injection"`

---

## reviewer

**Path**: `agents/reviewer/`
**Model**: ${GITRAILS_MODEL}
**Temperature**: 0.2
**Role**: Code quality reviewer (SOD: analyzer)

**Skills**:
- `review-diff` — structured diff analysis
- `score-risk` — risk formula computation (security + bug + complexity + test + docs)
- `suggest-tests` — missing test case identification

**Risk formula**:
```
risk = (0.35 × security_severity)
     + (0.25 × bug_probability)
     + (0.20 × complexity_delta)
     + (0.10 × test_coverage_gap)
     + (0.10 × documentation_debt)
```

---

## scribe

**Path**: `agents/scribe/`
**Model**: ${GITRAILS_MODEL}
**Temperature**: 0.4
**Role**: Documentation writer (SOD: writer)

**Skills**:
- `generate-changelog` — CHANGELOG.md entry generation
- `document-module` — JSDoc/docstring generation for undocumented functions

**Constraint**: NEVER invents behavior not present in the code

---

## mirror

**Path**: `agents/mirror/`
**Model**: ${GITRAILS_MODEL}
**Temperature**: 0.3
**Role**: Self-auditor / conscience (SOD: auditor)

**Skills**:
- `audit-decisions` — reviews gitrails' findings for accuracy
- `propose-learning` — proposes knowledge updates via PR
- `contradiction-check` — detects rule drift and conflicting behaviors

**Timing**: Runs AFTER all other agents complete
**Constraint**: NEVER updates knowledge/ directly — only via human-approved PR
