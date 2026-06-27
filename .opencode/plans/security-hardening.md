# Security Hardening Plan

## Scope
Fix 5 production-blocking security vulnerabilities across 9 files.

## Files to Modify (9 total)
1. `src/app/api/auth/[...nextauth]/route.js` — Remove `session.accessToken` from session callback
2. `src/app/api/dashboard/route.js` — `getToken()` + error sanitization
3. `src/app/api/transaction/route.js` — `getToken()` + input validation + error sanitization
4. `src/app/api/transaction/[id]/route.js` — `getToken()` + tab whitelist + error sanitization
5. `src/app/api/budgets/route.js` — `getToken()` + error sanitization
6. `src/app/api/goals/route.js` — `getToken()` + error sanitization
7. `src/app/api/settings/route.js` — `getToken()` + error sanitization (extra file found via grep)
8. `src/app/api/debts/route.js` — `getToken()` + error sanitization (extra file found via grep)
9. `next.config.js` — Security headers

## Notes
- The user's task lists 6 API routes, but grep found 2 additional routes (`settings`, `debts`) that also use `session.accessToken` and leak `err.message`. All 8 must be patched.
- `getToken` from `next-auth/jwt` reads the JWT from request cookies automatically — no secret needed.
