# Wave 9 — Payment confidence and pending-state refresh (implementation plan)

Date: 2026-09-24 · Source: `docs/2026-09-09-product-improvement-roadmap.md` → Wave 9 (line 1028) · Risk: Medium for UI; payment authorization and proof-storage contracts remain protected High-risk boundaries (untouched) · Status: plan only

## The decided SLA

**Keep "biasanya diproses dalam 1–30 menit"** (user decision, 2026-09-24). This formalizes the promise the current `PendingPanel` already makes into the consistent review-time expectation shown by the timeline, alongside the existing 30-minute WhatsApp CS escalation.

## Current state (explored 2026-09-24)

- `src/components/PaymentQrisFlow.jsx` (712 lines): `loadPayments(0)` on mount only; a 30-second `setNow` clock tick (local time math, no refetch); **no foreground/visibility refresh and no manual "Periksa status" control**; `PendingPanel` (line 425) shows the 1–30 menit copy + WhatsApp CS but no timeline and no refresh.
- Stored payment states (`payments` table, `supabase/007-payments-phase2.sql`): `awaiting_payment`, `pending`, `approved`, `rejected`, `revoked`, `expired`, `cancelled` — with `created_at`, `updated_at`, `reviewed_at`, `payment_at`, `proof_url` (private bucket path, never rendered as a URL client-side).
- `PaymentStatusBanner` (dashboard) fetches `/api/payments?limit=1` on mount and surfaces approved/rejected/revoked — stays as-is.
- All payment actions already flow through per-user, service-role API routes (`/api/payments`, `/api/payments/[id]`) with `user_id` scoping and unique one-active-payment index; rejection reason, resubmission, QR expiry/grace, reference, amount, and proof preview exist and must remain intact.

## Task contract

**Outcome:** A user with a payment in flight always knows which of the four stages it is in, can refresh the pending status explicitly and on app foreground, and sees the agreed 1–30 menit expectation with WhatsApp CS for exceptions — without the UI ever implying approval before the admin decision, and without continuous polling.

**Included:**
1. A compact 4-step `PaymentTimeline` rendered on the payment screen for active payments, driven **only** by stored payment status.
2. **Periksa status** manual refresh while proof is pending: bounded (in-flight disable + short cooldown), accessible, resilient to offline/server failure.
3. Bounded refresh when the screen opens (exists) and when the app returns to the foreground (new `visibilitychange` handling) — **no continuous polling by default** (the existing 30s tick stays local-time-only and does not hit the network).
4. Consistent SLA copy (1–30 menit) across timeline and panel; WhatsApp CS preserved.
5. Screen-reader announcement of refresh outcomes.

**Exclusions:** no changes to payment authorization, proof upload/validation/storage, admin review flow, RLS, migrations, or any `/api/payments*` contract (High-risk protected boundaries); no background intervals or push; no Wave 10 responsive/a11y gate work; no changes to `PaymentStatusBanner` copy or dismissal; no QR expiry/grace logic changes.

**Protected invariants:** cross-user isolation (user-scoped reads unchanged); "Disetujui" renders only from stored `approved` status; rejected path keeps reason + resubmission intact; registration-closed and feature-disabled handling intact; no proof URL or admin detail in client markup.

## Batches

**Batch A — Timeline component + state mapping (tests first)**
- New presentational `PaymentTimeline` (in `src/components/` or `_components/`): steps **Menunggu pembayaran → Bukti diterima → Sedang ditinjau → Disetujui/Ditolak**; `aria-current="step"` on the active step; done/current/pending visual states; rejected renders the final step as rejected (with existing reason/resubmit path below, untouched).
- Mapping from stored status: `awaiting_payment` → step 1 current; `pending` → 1–2 done, step 3 current (proof receipt is implied by status `pending` — no new data needed); `approved` → all done; `rejected` → final rejected.
- Replace `PendingPanel`'s static card with timeline + SLA copy + WhatsApp CS; render the timeline (step 1 current) on the awaiting screen too.
- Focused: new `tests/components/PaymentTimeline.test.jsx` — every payment state maps correctly; approval never shown unless stored; compact markup + a11y roles.

**Batch B — Bounded pending refresh (tests first)**
- **Periksa status** button in the pending view: reuses `loadPayments(0)`; disabled while in-flight and during a short cooldown (e.g. 10 s) to keep refresh bounded; remains usable after failures.
- Offline/server failure: existing error surface shows a retry-able message; no crash, no stale "Disetujui".
- `visibilitychange`: when the tab becomes visible and an active payment exists (`awaiting_payment`/`pending`), refetch once — throttled by the same cooldown; no interval timers added.
- After manual actions (`submit_proof`, start, cancel) the resulting state already updates local state; verify submit lands the user on the timeline's "Sedang ditinjau".
- Screen-reader announcement: polite live region reports "Status diperbarui" / "Status belum berubah" / failure.
- Focused: extend `tests/components/PaymentQrisFlow.test.jsx` — foreground refetch, cooldown bounding, offline resilience, announcement, approval only from stored state, registration-closed still honored.

**Batch C — Copy consistency + final gate**
- 1–30 menit copy appears exactly once per view (timeline), WhatsApp CS escalation after 30 menit preserved; dedupe with `PendingPanel` legacy copy.
- Cross-user/privacy check: assert no `proof_url`/storage path in rendered markup (existing behavior; pin with a test).
- Gate: independent final diff review → full suite once → production build once → `git diff --check` → persist decision record here + `progress.md` entry.

## Roadmap focused-check mapping

- Every payment state → Batch A mapping tests (+ existing history/expired/cancelled tests stay green).
- Foreground refresh + offline retry + bounded manual refresh → Batch B.
- Rejected resubmission → existing submit/resubmit paths untouched; regression-verified.
- Registration closed → existing `PaymentQrisFlow` closed-state tests stay green.
- Cross-user access denial → existing API `user_id` scoping unchanged (no API diff); DOM privacy test in Batch C.
- Screen-reader announcement → Batch B live region.

Nothing will be committed with this plan document; implementation follows the same TDD, batching, single-final-review, and full-suite/build gate as Waves 1–8.

## Implementation record (2026-09-24)

Implemented in full, matching the plan:

1. **`src/components/PaymentTimeline.jsx` (new):** presentational 4-step timeline with `getTimelineSteps(status)` — awaiting_payment → step 1 current; pending → 1–2 done, 3 current; approved → all done; rejected → final step reads "Ditolak"; unknown/revoked/cancelled/expired fail-closed to step 1. `aria-current="step"` + sr-only "Langkah N dari 4" status per view.
2. **`src/components/PaymentQrisFlow.jsx`:** timeline rendered in both the pending panel (replacing the static-only card) and the awaiting screen; **Perikca status** button bounded by in-flight disable + a 10-second ref-cooldown; single refetch on `visibilitychange` → visible while a payment is active (no intervals; the pre-existing 30 s tick remains local-time-only); announcement `<p role="status">` at component level so it survives the pending → approved transition; approval/rejection announcements derive only from fetched server state, tracked by payment id because approved/rejected payments leave the active set.
3. **Copy:** the 1–30 menit promise appears once per view with the 30-minute WhatsApp CS escalation preserved; refresh announcements added for unchanged/changed/approved/rejected/failed outcomes.

## Verification

- Focused: `tests/components/PaymentTimeline.test.jsx` (10 — every stored state mapped, no premature approval, rejected final step, fail-closed unknowns), `tests/components/PaymentQrisFlow.test.jsx` extended to 12 (bounded control + announcement, approval via refresh, server-failure retry-ability, foreground refetch-once + cooldown, no control outside pending, no proof URL/storage path in markup, plus all pre-existing closed-registration/expired/grace regressions).
- Self-review corrections: removed an unused `lastRefreshAt` state; documented the dependency-less visibility effect (re-attaches per render to avoid stale closures); added the rejected announcement; fixed status tracking by payment id (approved payments exit the active set).
- Gate: full suite **1144 passed / 2 skipped** (169 files) → production build passed (placeholder env vars) → `git diff --check` clean.
- Roadmap focused-check mapping: every payment state (timeline tests + history/expired/cancelled regressions), foreground refresh (visibility test), offline retry (failure test), rejected resubmission (existing paths untouched, regression-verified), registration closed (existing tests green), cross-user access denial (no API changes; user-scoped routes untouched; DOM privacy pin), screen-reader announcement (role="status" region).
