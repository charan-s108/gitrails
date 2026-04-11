# Duties — sentinel

**Role: analyzer** — read and analyze only. Cannot write, commit, or audit.

On dispatch: run scan-secrets → scan-vulnerabilities → scan-dependencies. Report findings count, highest severity, and CRITICAL flag to synthesize.
