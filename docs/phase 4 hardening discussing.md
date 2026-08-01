# Phase 4 — Polish + Security Hardening Discussion

**Date:** 1 August 2026
**Status:** Phase 4 is complete as of 1 August 2026; migration, automated verification, and authenticated end-to-end release checks passed
**Release context:** Play Store React Native release blocker
**Current app state:** Commercialization Phases 2-4 are complete; Phase 5 Testing + Verification is next. The `mobile/` project has not started.

## Purpose

This document collects the Phase 4 hardening topics, questions, and recommended answers in one place. It replaces the need to discuss one question at a time in chat.

This is a requirements, decision, and implementation record. The Phase 4 completion gate has now passed; it does not authorize mobile implementation.

## Latest accepted updates — 1 August 2026

- **C6:** Use the existing global `feature_flags` table plus a separate user-override table.
- **C7:** The admin switchboard should monitor and control all user-facing product features, with safety infrastructure protected from accidental disabling.
- **C8:** Enforce feature switches in both the UI and the server/API.
- **C10:** Fail production when required environment settings are missing; warn and continue in development.
- **C11:** Use the full Phase 4 implementation, build, test, security, and feature-override checklist as the completion gate.
- **I1:** Optional or risky features fail closed when their flag cannot be read; core ledger and authentication access remains available.
- **I3:** Successful feature-switch changes invalidate the short server cache immediately, with a short fallback cache still allowed.
- **I4:** Add the Feature Controls section to the existing `/admin` area.
- **I5:** Hide disabled features and show `Fitur sedang tidak tersedia.` only for stale or direct access.
- **I6:** Resolve flags server-side and return only the current user’s effective feature access through `/api/me` or the existing authenticated response path.
- **I7:** Give the public NextAuth callback a separate IP-based rate limit.
- **I9:** Keep security headers in `next.config.js` and do not duplicate them in middleware.
- **I10:** Use minimal safe request-aware logging without tokens, payment-proof URLs, full financial values, or unnecessary personal data.
- **I11:** The Vercel screenshot confirms all 11 required variable names are configured for Production and Preview; `SPREADSHEET_ID` is an extra legacy variable, not required by the multi-tenant runtime.
- **M1:** Use a clear OFF confirmation explaining scope, data preservation, and reversibility.
- **M2:** Record `updated_at` and `updated_by` without adding a full audit-history table in the first Phase 4 pass.
- **M3:** Find users through email/name search and a small selectable result list.
- **M4:** Keep feature-flag reads server-side and return only effective access for the signed-in user.
- **M6:** Keep `/api/health` as a fast liveness/configuration check with no Google or Supabase network calls.
- **N1:** Defer a separate full audit-history table; last-changed metadata is enough for the first release.
- **N2:** Defer Redis or distributed rate limiting until multiple instances or real scaling evidence requires it.
- **N3:** Include simple future-dated global or targeted ON/OFF changes; defer recurring schedules.
- **N4:** Include supported admin user-segment filters before applying targeted feature changes; keep precise selection available.
- **N5:** Keep the short unavailable message and hidden feature; defer branded maintenance pages.
- **N6:** Keep switched-off feature code and data until a separate archive/removal decision is approved and verified.

## Priority labels

- **Critical** — Must be decided and implemented before Phase 4 can be accepted.
- **Important** — Should be decided before release verification because it affects safety, operations, or user behavior.
- **Medium** — Useful for a reliable first release but can be kept small.
- **Nice to Know** — Deliberately deferred unless the product or scale requires it.

Status labels:

- **Agreed** — Decision already accepted in this discussion.
- **Open** — Recommendation is ready, but the decision still needs confirmation.
- **Deferred** — Not part of the first Phase 4 implementation.

## Critical topics

### C1. Which API routes receive rate limiting?

**Question:** The original prompt says “all 15 API routes,” but the repository now contains 27 route files and the prompt lists 17 routes. Which scope is correct?

**Recommendation:** Protect every security-sensitive app-owned API endpoint, including:

- dashboard and user data routes;
- transaction, budget, goal, debt, event, and bill routes;
- payment and payment-proof routes;
- admin payment and Pro-restoration routes;
- account deletion and legacy-sheet connection;
- migration routes; and
- `/api/download-apk`, because it writes download-tracking data to Supabase even though it returns an APK redirect.

Keep the static asset itself outside the business API limiter. Give health checks and the NextAuth callback their own handling rather than applying the normal authenticated-user pattern blindly.

**Status:** Implemented locally — the current security-sensitive API scope is covered by the middleware limiter.

### C2. What rate limits should be used?

**Question:** Should every route use the same request limit?

**Recommendation:** Use one small shared in-memory limiter with a few clear limits:

- normal API actions: **60 requests per minute** per authenticated user, or per IP when unauthenticated;
- payment-proof and APK-download endpoints: **10 requests per minute**;
- account deletion and other destructive actions: **5 requests per minute**.

Return HTTP `429` with a `Retry-After` header when the limit is reached.

**Status:** Agreed.

### C3. How should API input be validated?

**Question:** Should every route keep its own validation, or should validation be shared?

**Recommendation:** Create one lightweight JavaScript validation helper and reuse it across mutation routes. It should check required fields, data types, amounts, dates, allowed values, and text lengths. Payment-file validation should continue to enforce file type and size rules.

Do not add Zod or another validation dependency. Preserve existing valid behavior while making invalid input consistent and safer.

**Status:** Agreed.

### C4. What should happen when a feature is switched off?

**Question:** Should turning a feature OFF delete its data or code?

**Recommendation:** No. Turning a feature OFF should:

- hide the feature from the affected users’ interface;
- stop its calculations and API access;
- preserve all existing user data; and
- allow the feature to return when switched ON again.

The system should not silently delete Health Score results, reports, or related user records.

**Status:** Agreed.

### C5. How should global and user-specific feature settings work?

**Question:** How can an admin affect only selected users without changing the experience for everyone else?

**Recommendation:** Use two levels:

1. A global ON/OFF setting is the default for everyone.
2. A per-user override can be assigned to selected users.

The rule is:

- a user-specific override wins when it exists;
- an unlisted user inherits the global setting;
- an admin can set a user to ON, OFF, or **Use global setting**; and
- removing an override returns that user to the global behavior.

Example: if Health Score is globally ON, an admin can turn it OFF for User A only. User A loses access, while every unlisted user keeps access.

**Status:** Agreed.

### C6. Where should global and user-specific settings be stored?

**Question:** Should user targeting be stored inside the existing global flag row, as JSON, or in a separate table?

**Recommendation:** Reuse the existing `feature_flags` table for global settings and add a small user-override table with:

- `feature_key`;
- `user_id`;
- `enabled` as `true` or `false`;
- `updated_at`; and
- `updated_by`.

Use a unique key on `(feature_key, user_id)`. Do not store a large JSON checklist, and do not move financial ledger data out of Google Sheets.

**Status:** Agreed.

### C7. Which features are allowed to be switched off?

**Question:** Should every feature, including core authentication and ledger access, be controlled by the admin switchboard?

**Recommendation:** The admin switchboard should be able to monitor and control every user-facing product feature, including:

- transactions and the ledger modules;
- Budgets, Goals, Debts, Momental, and Bills;
- Smart Insights;
- Health Score;
- Cash Flow Forecast;
- Anomaly Alerts;
- Financial Independence;
- What-If analysis;
- Year-in-Review;
- PDF Reports;
- QRIS upgrade flow; and
- future user-facing features added to Artami.

The switchboard must not be allowed to disable the safety infrastructure that protects authentication, admin authorization, the feature-flag system itself, privacy/security controls, or data integrity. These are system protections, not retireable product features.

**Status:** Agreed.

### C8. Where must feature switches be enforced?

**Question:** Is hiding the feature in React enough?

**Recommendation:** No. Enforce the switch in both places:

- the UI hides unavailable features; and
- the server rejects direct API requests for unavailable features.

The client must never be the only security boundary. Return the standard safe error response, such as HTTP `403` with `Fitur sedang tidak tersedia.`, when an authenticated request reaches a disabled feature.

**Status:** Agreed.

### C9. Who can change feature switches?

**Question:** Which administrators can manage global settings and user overrides?

**Recommendation:** Any authenticated account listed in the normalized Supabase `admins` table can manage them. Use the existing server-side `requireAdmin` authorization; do not rely on a hidden admin button or client-side checks.

**Status:** Agreed.

### C10. What happens when required environment settings are missing?

**Question:** Should the application continue running with incomplete production configuration?

**Recommendation:**

- production should fail during deployment/startup when a required setting is missing;
- development should show a warning and continue;
- logs should show missing variable names only, never secret values.

The production-required list should cover Google OAuth, NextAuth, Supabase, the legacy owner, and the Google Picker settings because the release plan requires the owner legacy-sheet flow.

`LOG_LEVEL` remains optional with a safe default.

**Status:** Agreed.

### C11. What proves Phase 4 is complete?

**Question:** Which checks must pass before the release blocker can be marked complete?

**Recommendation:** Phase 4 should not be marked complete until all of these pass:

- production build;
- health endpoint returns correct `200` and `503` states;
- normal and sensitive-route rate limits return `429` correctly;
- malformed inputs are rejected without data writes;
- all covered routes use the safe error shape;
- security headers and request IDs are present where intended;
- global feature toggles work;
- per-user ON/OFF overrides work;
- users without overrides inherit the global setting;
- clearing an override restores global behavior;
- non-admin users cannot change flags;
- turning a feature OFF preserves data;
- turning it back ON restores access; and
- no secrets or private user assignments leak to clients.

**Status:** Agreed.

## Important topics

### I1. What happens if Supabase cannot provide a feature flag?

**Question:** Should an unavailable flag default to ON or OFF?

**Recommendation:** Fail closed for optional or risky features: treat them as OFF when the flag cannot be read. Keep core authentication, the basic ledger, and safe existing-data reads available. A flag failure must not create a path around Free/Pro entitlement checks.

**Status:** Agreed.

### I2. Which setting wins when global and user settings differ?

**Question:** What is the precedence rule?

**Recommendation:** A per-user override wins. If no override exists, use the global setting. Provide a visible **Use global setting** action so an admin can remove an exception instead of guessing its state.

**Status:** Agreed and implemented with the three-state admin control.

### I3. How quickly should a switch take effect?

**Question:** Should the change be immediate, or can it wait for a cache to expire?

**Recommendation:** Invalidate the server-side flag cache immediately after a successful admin update. Keep a short fallback cache, such as 60 seconds, to reduce database reads. This gives fast behavior without querying Supabase on every request.

**Status:** Agreed.

### I4. Where should admins manage the switches?

**Question:** Should feature controls be a new page or part of the existing admin area?

**Recommendation:** Add a **Feature Controls** section to the existing `/admin` page. Each row should show:

- a human-readable feature name;
- a short description;
- the global ON/OFF control;
- the current override count;
- user search by email or name; and
- per-user ON/OFF/Use global controls.

Require confirmation before turning a global or user-specific feature OFF. Turning it ON can be immediate. Show a clear success or failure message after every save.

**Status:** Agreed.

### I5. What should users see when a feature is disabled?

**Question:** Should the app show a maintenance screen or make the feature disappear?

**Recommendation:** Hide the feature from normal navigation and show a short Indonesian message if an already-open screen or direct request reaches the disabled feature: `Fitur sedang tidak tersedia.` Do not build a separate maintenance system yet.

**Status:** Agreed.

### I6. How should flag data be exposed to clients?

**Question:** Can every client read the global flag table and user assignments directly?

**Recommendation:** No. Read flags server-side using the service-role client, calculate the effective flags for the current user, and return only that user’s effective feature access through the existing authenticated response path such as `/api/me`.

Never expose the full user-override list or another user’s feature assignments.

**Status:** Agreed.

### I7. Should the NextAuth callback be rate-limited?

**Question:** The normal limiter expects an authenticated user, but the OAuth callback is public. How should it be protected?

**Recommendation:** Give the NextAuth route a separate IP-based limit, such as 10 requests per minute, while preserving OAuth callback behavior. Do not apply the normal authenticated-user helper before NextAuth has established a session. Keep health checks exempt or on a much higher monitoring limit.

**Status:** Agreed.

### I8. Is the in-memory rate limiter acceptable?

**Question:** Should Phase 4 add Redis or another shared rate-limit service?

**Recommendation:** No. Use the in-memory limiter for the current low-scale or single-instance deployment. Document the limitation: separate server instances do not share counters. Revisit this only after a multi-instance deployment or real abuse evidence.

**Status:** Agreed.

### I9. Should security headers be added in middleware?

**Question:** The prompt asks for middleware headers, but `next.config.js` already defines security headers. Should both systems be used?

**Recommendation:** Keep each responsibility in one place. Retain security headers in `next.config.js`; add middleware only for behavior that truly needs request-time handling, such as a request ID. Do not duplicate the same headers in both locations.

**Status:** Agreed.

### I10. What should be logged?

**Question:** Should Phase 4 introduce a large logging system?

**Recommendation:** Use a minimal JSON logger or improve the existing `console` calls without adding Winston. Include a safe request ID and useful route/status context. Never log access tokens, refresh tokens, payment-proof URLs, full financial values, or unnecessary personal data.

**Status:** Agreed.

### I11. Which environment variables are truly required?

**Question:** The prompt lists seven variables, but the application also uses Picker and legacy-owner settings. Which list should production validate?

**Recommendation:** Validate these for the complete web release:

- `GOOGLE_CLIENT_ID`;
- `GOOGLE_CLIENT_SECRET`;
- `NEXTAUTH_URL`;
- `NEXTAUTH_SECRET`;
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `LEGACY_SHEET_OWNER_EMAIL`;
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`;
- `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`; and
- `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER`.

The validator should distinguish server secrets from public browser configuration and must never bundle server secrets into mobile code.

**Status:** Agreed based on the Vercel environment-variable names shown in the screenshot. Values were not inspected.

### I12. Should mobile receive feature flags now?

**Question:** Should Phase 4 add mobile-only flag endpoints before the Expo app exists?

**Recommendation:** No mobile-only endpoint now. Make the existing authenticated effective-entitlement response reusable by the future mobile client. Keep mobile implementation in the later Expo phases.

**Status:** Agreed with the existing release sequence.

## Medium topics

### M1. What should the OFF confirmation say?

**Question:** What should an admin see before disabling a feature?

**Recommendation:** Explain the scope and data safety plainly:

> Turn off this feature for the selected users? It will disappear or stop working for them. Existing data will not be deleted, and the feature can be turned on again later.

For a global switch, replace “selected users” with “all users without a specific override.”

**Status:** Agreed.

### M2. Should the system record the last admin change?

**Question:** Do we need a full history of every feature-toggle change?

**Recommendation:** Store `updated_at` and `updated_by` on the global flag and user-override records. Do not add a full audit-history table in the first Phase 4 pass. Add history later if support, compliance, or multiple-admin operations require it.

**Status:** Agreed.

### M3. How should admins find users?

**Question:** Should the interface show every user in one large checklist?

**Recommendation:** Start with email/name search and a small selectable result list. Avoid a large “load every user” checklist. Add bulk selection only when the user count makes individual selection impractical.

**Status:** Agreed.

### M4. Should global flags be visible to normal clients?

**Question:** The current Supabase RLS allows public reads of global flags. Should that remain?

**Recommendation:** Do not let the browser query Supabase directly for feature control. Read flags on the server and return only effective access for the signed-in user. This also keeps per-user targeting private.

**Status:** Agreed.

### M5. Should `googleapis` be removed?

**Question:** The package is installed, but the application appears to use direct fetch calls for Sheets. Should it be removed?

**Recommendation:** Remove it only after a final repository-wide import search confirms no runtime or build path uses it. Update the lockfile and run tests/build afterward. This is cleanup, not a reason to delay other hardening work.

**Status:** Implemented locally — no direct runtime import remains; the lockfile retains the transitive copy required by `@bubblewrap/core`.

### M6. What should the health check identify?

**Question:** Should `/api/health` call external services to prove Google and Supabase are reachable?

**Recommendation:** Keep it as a fast liveness/configuration check:

- `200` when critical configuration is present;
- `503` when it is missing;
- safe booleans and version only; and
- no Google or Supabase network calls.

Add a deeper dependency-readiness check only if deployment monitoring later needs it.

**Status:** Agreed.

## Nice to Know / future extensions and deliberate deferrals

### N1. Full feature-toggle audit history

**Recommendation:** Defer a separate audit table. Last-changed metadata is enough for the first release. Add history if multiple administrators need accountability or support needs to reconstruct old states.

**Status:** Agreed.

### N2. Redis or distributed rate limiting

**Recommendation:** Defer until the deployment uses multiple instances or the in-memory limiter is proven insufficient.

**Status:** Agreed.

### N3. Scheduled feature changes

**Recommendation:** Support simple future-dated ON/OFF scheduling for global and targeted feature settings. Store one activation time and apply the transition on the first read after that time. Recurring schedules and complex scheduling rules remain deferred.

**Status:** Implemented locally.

### N4. Advanced user segments

**Recommendation:** Provide supported account-data filters before applying a targeted feature change. The first version uses email/name search, tier, and account age; keep per-user overrides available for precise exceptions and avoid exposing unrelated private user data.

**Status:** Implemented locally.

### N5. Rich maintenance pages

**Recommendation:** Use a short unavailable message and hide the feature. Build a branded maintenance page only if disabled features need user-facing explanations.

**Status:** Agreed.

### N6. Removing archived feature code

**Recommendation:** Turning a switch OFF is not code removal. Keep code and data until a separate archive/removal decision is approved and verified.

**Status:** Agreed.

## Historical prompt conflicts and rollout notes

These items are retained as the decision trail; implementation has resolved the design gaps, while deployment still needs the live checks below:

1. The prompt says “all 15 API routes,” but the repository has 27 route files and the prompt lists 17.
2. The prompt suggests one uniform 60-request limit; this discussion adds 10 and 5 request limits for sensitive endpoints.
3. The prompt describes global feature flags only; the approved design now requires per-user overrides.
4. The current Phase 3 policy says there are no per-user overrides. That was true for Phase 3 implementation and must be clearly superseded by the Phase 4 design rather than silently changing history.
5. Migration `009-phase4-feature-flag-foundation.sql` adds the private user-override table.
6. The existing admin page now includes the Feature Controls section.
7. The prompt’s health example checks only three environment values; the complete production list is larger.
8. Calling `process.exit(1)` from `next.config.js` needs build/deployment verification.
9. Security headers already exist in `next.config.js`; middleware should not duplicate them.
10. The prompt’s feature-flag test does not cover admin authorization, per-user overrides, inheritance, override removal, or confirmation.
11. The prompt does not define behavior when a flag cannot be read.
12. Logger creation and `googleapis` removal should be treated as supporting hardening work, not mistaken for the entire release blocker.

## Phase 4 implementation status

Verified and complete:

- shared validation, request-aware logging, request IDs, and route rate limits;
- production environment fail-fast checks and the safe `/api/health` route;
- private global flags plus per-user overrides, one-time schedules, cache invalidation, and protected system features;
- admin global/user controls with OFF confirmations, user filters, and `Use global` reset;
- UI and API feature enforcement across ledger, planning, reports, and QRIS flows; and
- focused/full tests and a production build; and
- authenticated live admin acceptance checks for global ON/OFF, per-user overrides and inheritance, override removal, future scheduling, disabled-feature behavior, data preservation, and non-admin protection.

Migration status:

- `supabase/009-phase4-feature-flag-foundation.sql` is applied in the live Supabase project.
- Read-only verification confirmed the feature rows, zero current user overrides, and intact admin/user records.
- Anonymous access is denied for both feature tables.
- The owner completed the live admin/global/override/schedule and disabled-feature smoke checks after deployment; data remained safe and non-admin access was rejected.

Phase 4 acceptance result:

- production build, health behavior, rate limits, validation/error contracts, security headers, request IDs, feature controls, and client-leak checks passed through the automated and manual verification scope;
- the Play Store Phase 4 blocker is cleared; and
- Phase 5 Testing + Verification is now the active commercialization phase.

## Phase 4 implementation boundary

Phase 4 is complete. The remaining release blockers are the web UI/UX revamp, canonical-domain migration, Phase 5 verification, and the later React Native/Expo work.
