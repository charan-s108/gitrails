# Scenario: BLOCKED

**Expected verdict**: ⛔ BLOCKED  
**Expected risk score**: 0.80–0.95  
**Why**: OWASP A01, A02, A03, A05, A07, A09 violations — CRITICAL findings force block.

## Seeded issues

| File | OWASP | Issue |
|---|---|---|
| `src/auth/config.js` | A07 | Hardcoded AWS credentials |
| `src/auth/config.js` | A02 | `Math.random()` for tokens, weak JWT secret |
| `src/auth/config.js` | A05 | `debug: true`, CORS wildcard |
| `src/db/queries.js`  | A03 | SQL injection via string concat |
| `src/db/queries.js`  | A02 | MD5 password hashing |
| `src/db/queries.js`  | A03 | `eval()` with user input |
| `src/auth/login.js`  | A07 | Null dereference, hardcoded password |
| `src/auth/login.js`  | A09 | Silent auth error swallowing |
| `src/auth/login.js`  | A01 | Admin route with no RBAC |
| `src/routes/api.js`  | A05 | Stack traces + env vars in error response |
| `src/routes/api.js`  | A03 | XSS via `innerHTML` |
