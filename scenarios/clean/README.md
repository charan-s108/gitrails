# Scenario: APPROVED

**Expected verdict**: ✓ APPROVED  
**Expected risk score**: 0.05–0.25  
**Why**: Secrets via env vars, parameterized queries, proper error handling, input validation, JSDoc.

## What this demonstrates

- No hardcoded credentials — all secrets from `process.env`
- Parameterized SQL queries — no injection risk
- `crypto.randomBytes` for tokens — not `Math.random`
- Input validation at API boundary
- Proper null checks and error propagation
- JSDoc on public functions
- Structured error responses — no stack traces to client
