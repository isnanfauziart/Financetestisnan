# Task 4 fix report — current

Date: 2026-08-08

Scope:
- `src/lib/forecast.js`
- `tests/lib/forecast.test.js`

Requested bug:
- `hasFiniteValue()` treated arbitrary non-numeric strings as valid because it accepted `toFiniteNumber(value)`.
- That let `readRoutineSurplus()` consume invalid `surplusRutin` as `0` instead of falling back to legacy `surplus`, then `income - expense`.

TDD record:
- Added regression test: `falls back to legacy surplus when surplusRutin is non-numeric`
- Red verification:
  - Command: `npm.cmd test -- tests/lib/forecast.test.js`
  - Result: 1 failed / 15 passed
  - Failure: expected last actual chart surplus `1300000`, received `0`
- Green fix:
  - Changed `hasFiniteValue()` to accept only nonblank values whose direct `Number(value)` is finite
- Green verification:
  - Command: `npm.cmd test -- tests/lib/forecast.test.js`
  - Result: 16 passed

Files changed:
- `src/lib/forecast.js`
- `tests/lib/forecast.test.js`

Notes:
- Kept the fallback order as requested: `surplusRutin -> surplus -> income - expense`
- Did not edit any other Task 4 files or docs
- Preserved scheduled bill behavior and billpay protection by limiting the change to numeric-validity detection for routine/legacy surplus checks

Concerns:
- None from the focused forecast suite; only the existing Vitest/Vite CJS deprecation warning appeared during test runs
