# demo-target

Intentionally vulnerable Node.js app used as the gitrails scan target.

**DO NOT deploy this code.** It contains deliberate security vulnerabilities
for demonstration purposes.

## Vulnerabilities seeded

| File | OWASP | Issue |
|---|---|---|
| `src/auth/config.js` | A07 | Hardcoded AWS key (`DEMO-AWS-ACCESS-KEY-ID`) |
| `src/auth/config.js` | A02 | MD5/weak JWT secret |
| `src/auth/config.js` | A05 | `debug: true`, CORS wildcard |
| `src/auth/config.js` | A07 | `Math.random()` for token generation |
| `src/auth/login.js` | A07 | Null dereference on `user.profile` |
| `src/auth/login.js` | A09 | Silent auth error swallowing |
| `src/auth/login.js` | A01 | Admin route with no RBAC check |
| `src/db/queries.js` | A03 | SQL injection via string concat + template literal |
| `src/db/queries.js` | A02 | MD5 password hashing |
| `src/db/queries.js` | A03 | `eval()` with user input |
| `src/routes/api.js` | A05 | Stack traces + env vars in error response |
| `src/routes/api.js` | A03 | XSS via `innerHTML` |
| `package.json` | A06 | `lodash@4.17.15` (CVE-2021-23337), `axios@0.21.1` (SSRF) |

## Run gitrails against this target

```bash
# From the gitrails/ root:
npm run demo:setup   # indexes demo-target files into vector store
npm run demo:scan    # runs gitrails security scan on demo-target
```
