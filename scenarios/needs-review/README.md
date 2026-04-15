# Scenario: NEEDS_REVIEW

**Expected verdict**: ⚠ NEEDS_REVIEW  
**Expected risk score**: 0.35–0.65  
**Why**: No CRITICAL security issues, but multiple code quality and medium-severity concerns.

## Issues seeded

| File | Severity | Issue |
|---|---|---|
| `src/api/users.js`    | MEDIUM | Missing input validation on user-supplied params |
| `src/api/users.js`    | MEDIUM | No auth middleware on update/delete routes |
| `src/service/user.js` | HIGH   | Null dereference — result not checked before access |
| `src/service/user.js` | MEDIUM | Unhandled promise rejection in async function |
| `src/service/user.js` | MEDIUM | User email logged in plaintext (A09) |
| `src/utils/format.js` | LOW    | No JSDoc — public functions undocumented |
| All files             | MEDIUM | No test files present |
| All files             | LOW    | Inconsistent error handling patterns |
