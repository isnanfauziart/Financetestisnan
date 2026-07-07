# Updates Ideas

This file tracks the product, UX, accessibility, and backend improvements identified during the app audit.

Status legend:
- `[x]` done
- `[ ]` not done yet

## Critical Backend Fixes

- [x] Clarify the current Supabase model as server-only instead of implying client-side per-user RLS is active now.
- [x] Harden first-login user creation and spreadsheet assignment against race conditions.
- [x] Align new user Google Sheet provisioning with current API schema contracts.
- [x] Centralize and fix bill overdue / due-today / due-soon calculation.
- [ ] Enforce commercialization gating and usage limits server-side.
- [x] Add same-day idempotency protection for bill payment writes.

## Product and Information Architecture

- [ ] Reorganize top-level structure so responsibilities are clearer:
  - `Beranda` = summary + urgent actions
  - `Statistik` = analysis + reports
  - `Rencana` = goals + budgets + bills + planning
  - `Profil` = account + settings
- [ ] Move recurring-money management to a more intuitive place instead of splitting bills/goals/budgets across multiple tabs.
- [ ] Make `Beranda` more action-oriented with 1-2 strongest next-action cards.
- [ ] Add monetization UX for free limits, premium unlocks, approaching caps, and upgrade reasons.

## Stats UX

- [ ] Reduce cognitive overload in `Statistik` on mobile.
- [ ] Group the stats screen into clearer sections or a segmented sub-navigation such as `Ringkasan | Kategori | Tren | Recap`.
- [ ] Make lower-priority analytical blocks collapsible by default.
- [ ] Add clearer filter reset and filter-summary affordances.

## Transaction Entry UX

- [ ] Make add-transaction flow faster with stronger quick-add defaults.
- [ ] Add one-tap common category shortcuts for Indonesian spending habits.
- [ ] Use last-used account/category suggestions.
- [ ] Keep the full form for detail entry, but prioritize the fastest happy path.

## Localization and Copy

- [ ] Fully normalize user-facing copy into natural Indonesian.
- [ ] Remove remaining mixed English labels from production UI.
- [ ] Improve empty-state copy so it is specific to each context.

## Accessibility

- [ ] Make `src/app/dashboard/_components/SelectField.jsx` fully keyboard accessible or replace it with a simpler accessible pattern.
- [ ] Add proper dialog focus lifecycle in `src/app/dashboard/_components/Sheet.jsx`:
  - initial focus
  - focus trap
  - focus return
- [ ] Replace ad hoc overlays with the shared accessible dialog/sheet pattern.
- [ ] Add accessible chart summaries and non-pointer alternatives for chart interactions.
- [ ] Review bottom navigation semantics so ARIA matches actual behavior.
- [ ] Increase minimum text readability and audit contrast across the earthy/glass palette.
- [ ] Add reduced-motion support for animation-heavy surfaces and charts.

## Backend Hardening

- [ ] Add rate limiting on mutating API routes.
- [ ] Standardize API validation across routes with shared schemas.
- [ ] Add stronger idempotency for other sensitive write paths beyond bill payment.
- [ ] Improve observability with structured logs, request correlation, and audit trails.
- [ ] Add a health endpoint and basic operational diagnostics.

## Code Quality and Maintainability

- [ ] Reduce the orchestration burden still concentrated in `src/app/dashboard/page.js`.
- [ ] Extract more derived analytics and workflow logic into smaller dedicated modules/hooks.
- [ ] Review client-side caching to ensure it is correctly scoped per user/session.
- [ ] Standardize date handling across the app.
- [ ] Consolidate duplicated backend business rules into shared helpers where appropriate.

## Testing and Reliability

- [ ] Fix unrelated failing tests in `tests/components/QuickAddSheet.test.jsx`.
- [ ] Fix unrelated failing tests around dashboard cache helpers.
- [ ] Add more API-level regression tests for Google Sheets row contracts.
- [ ] Add tests around provisioning edge cases and migration behavior.
- [ ] Restore full `npm test` green status.

## Nice-to-Have UX Improvements

- [ ] Use more explicit localized savings-goal templates and Indonesian seasonal event nudges.
- [ ] Improve chart readability on small screens with more text summaries and fewer dense donut-only views.
- [ ] Standardize destructive confirmation UI across the app.
