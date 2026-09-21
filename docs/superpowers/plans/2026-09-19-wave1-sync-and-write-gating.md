# Wave 1 — Shared synchronization, cache, and recovery state

**Source:** `docs/2026-09-09-product-improvement-roadmap.md` → Detailed Implementation Plan → Wave 1. First post-financial-foundations wave in the audit's prescribed order.
**Risk tier:** High (gates financial writes). One implementation owner. AGENTS.md lean workflow applies.
**Approved:** 2026-09-19 (plan-mode approval; this document persisted as Step 0).

## Task contract

**Outcome:** A user can never mistake a failed refresh for a successful sync, and no financial write is possible while the app cannot trust what it displays.

**Included**
1. **Honest sync status.** `SyncStatus` learns the refresh-failure state and shows the approved copy: "Pembaruan data gagal — Menampilkan data terakhir yang berhasil disinkronkan [time]" with **Coba lagi**. Offline shows "Anda sedang offline — Menampilkan data terakhir yang tersimpan di perangkat ini." Schema-conflict shows its block message. The failure label clears only after a successful refresh. State comes from the existing `financialWriteState` store (`markStale`/`markSynced` already run in `page.js`) — no new state machine.
2. **Universal write gating.** Wire `useFinancialWriteGuard()` into every remaining money surface: QuickAddSheet, EditTransactionModal, BillPayModal, DebtPaymentModal, DebtSetupModal, GoalContributeModal, GoalPickerModal (goal-funded spend). Transaction **delete** and **Undo** (handled in `page.js`) check the guard and refuse with a toast when blocked. Disabled submit + short reason-specific message from the shared store.
3. **Automatic refresh on return.** `visibilitychange` triggers a refresh when the last successful sync is more than 5 minutes old, showing "Memeriksa pembaruan…" while current figures stay on screen. Extract the threshold decision into a small pure helper for testability.
4. **Logout cache privacy.** All sign-out paths (page.js connector/error screens, ProfileTab logout and account-deletion confirm via the shared handler) clear the owner-scoped dashboard cache. Theme/sound/haptics preferences survive.

**Exclusions:** no offline write queue; no Sheets hub (Wave 2); no recurring-to-bill fingerprint (Wave 3); no onboarding (Wave 4); no URL state (Wave 5); no new endpoints, migrations, or server-side changes; no copy changes beyond the approved strings; no quota/entitlement behavior change.

**Protected invariants:** quota/entitlement/feature checks always run after the write gate (the gate adds blocks, never removes them); cached data stays owner-scoped and visibly dated; four-tab shell untouched; fresh-empty sheets, provisional balances, and pending legacy review never block writes; no user-facing "likuid"; no cross-account rendering during logout/login transitions.

## Batches

| Batch | Scope (files) | Focused checks |
|---|---|---|
| **A** — sync truth + return refresh | `SyncStatus.jsx` (consume write-state store; failure/offline/schema-conflict states, keep props for testability), `page.js` (visibilitychange effect + threshold helper), `useDashboardCache.js` (threshold helper) | Regression-first `SyncStatus` tests: failure never shows "Tersinkron", offline distinct, clears on success; threshold helper boundary tests (4:59 / 5:01); figures persist during refresh |
| **B** — universal write gate | `QuickAddSheet.jsx`, `EditTransactionModal.jsx`, `BillPayModal.jsx`, `DebtPaymentModal.jsx`, `DebtSetupModal.jsx`, `GoalContributeModal.jsx`, `GoalPickerModal.jsx`, `page.js` (delete/Undo guards) | Per-surface: submit blocked when guard.blocked with reason copy, enabled when fresh; fresh-empty stays enabled; delete/Undo refuse with toast when blocked |
| **C** — logout privacy + sweep | `page.js`, `useDashboardCache.js` (`clearCache`) | Sign-out clears cache; prefs retained; account-switch shows no stale other-account data |

Batches are sequential (same owner, shared files). Batch A failure recovery already works via existing `markSynced` — no re-enable logic needed beyond what exists.

## Verification gate

1. Focused tests per batch (regression-first for behavior changes).
2. Exactly one independent final diff review (reviewer did not implement), given the full diff, contract, exclusions, and evidence.
3. Once: full Vitest suite, production build, `git diff --check`.
4. Append one `progress.md` entry at completion. No commit unless separately requested.
