# Artami Admin Workspace Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/admin` into a tabbed workspace, add a safe paginated Users directory with a read-only detail panel, record authenticated last activity with bounded writes, and make feature-flag changes visibly confirm success.

**Architecture:** `AdminShell` owns the tab/query-string state and shared success toast. Payments, Users, and Feature Controls remain bounded client sections. Admin user APIs expose only safe metadata, transaction usage, and payment metadata; proof remains behind the existing signed-URL route. Authenticated activity is recorded through a server-side helper with a five-minute write guard.

**Tech Stack:** Next.js 14 App Router, React 18 JavaScript, Tailwind CSS, Supabase service-role queries/RPCs, NextAuth JWT, Vitest, Testing Library.

## Global Constraints

- Keep the financial ledger in each user's Google Sheet; do not expose or read another user's ledger from admin.
- Never return OAuth access tokens, `spreadsheet_id`, private proof paths, or raw payment proof URLs from admin user responses.
- Keep `/admin` and every new admin API route protected by `requireAdmin`.
- Use the existing five-minute signed proof URL boundary and Indonesian UI copy.
- Use server-side pagination with defaults of 25 rows, newest registration first, and allowed page sizes 25, 50, and 100.
- Treat `last_seen_at` as authenticated Artami use; persist activity only when the stored value is older than five minutes. Admin Refresh only reads data.
- Keep feature-flag OFF confirmations, server response validation, and fail-closed feature behavior intact.
- Preserve unrelated dirty-worktree changes and do not modify `docs/commercialization-prompts.md`.

---

### Task 1: Add bounded authenticated activity tracking

**Files:**
- Create: `supabase/010-admin-user-activity.sql`
- Create: `src/lib/activity.js`
- Modify: `src/lib/apiAuth.js`
- Test: `tests/lib/activity.test.js`
- Test: `tests/lib/apiAuth.test.js` if the existing suite has an API-auth test file; otherwise add the narrow integration assertions to `tests/lib/activity.test.js`

**Interfaces:**
- `shouldRecordActivity(lastSeenAt, now, minimumIntervalMs = 300000)` returns a boolean and never throws for null/invalid timestamps.
- `recordAuthenticatedActivity(userId, lastSeenAt, now = new Date())` updates `users.last_seen_at` only when `shouldRecordActivity` returns true and returns the ISO timestamp written, or `null` when no write is needed.
- `getAuthContext(request)` calls the helper after the existing user lookup and keeps the returned user object’s `last_seen_at` current when a write succeeds.

- [ ] **Step 1: Write failing tests for the timestamp policy.**

```js
it("records first authenticated activity", () => {
  expect(shouldRecordActivity(null, new Date("2026-08-02T00:00:00.000Z"))).toBe(true)
})

it("does not write again inside the five-minute window", () => {
  expect(shouldRecordActivity(
    "2026-08-02T00:00:00.000Z",
    new Date("2026-08-02T00:04:59.000Z")
  )).toBe(false)
})

it("writes after the five-minute window", () => {
  expect(shouldRecordActivity(
    "2026-08-02T00:00:00.000Z",
    new Date("2026-08-02T00:05:00.000Z")
  )).toBe(true)
})
```

- [ ] **Step 2: Run the focused test and verify it fails because the helper is missing.**

Run: `npm.cmd test -- --run tests/lib/activity.test.js`  
Expected: FAIL with the activity module or exported function unavailable.

- [ ] **Step 3: Add the migration and minimal activity helper.**

Add nullable `last_seen_at TIMESTAMPTZ` to `users`, add a descending activity index, and add a comment explaining that the value represents authenticated Artami use. The helper must use a guarded Supabase update such as `.eq("id", userId).or("last_seen_at.is.null,last_seen_at.lt.<cutoff>")` so concurrent requests do not create a write on every request.

- [ ] **Step 4: Integrate the helper into `getAuthContext`.**

Call it after `getOrCreateUser` returns and before entitlement resolution. Activity-write failure must be logged as a warning and must not block a valid authenticated request, because activity is an admin metric rather than a ledger dependency.

- [ ] **Step 5: Run the focused tests and the existing auth tests.**

Run: `npm.cmd test -- --run tests/lib/activity.test.js tests/lib/apiAuth.test.js`  
Expected: PASS with zero failures. If `tests/lib/apiAuth.test.js` does not exist, run only the activity test and the existing auth-context test file discovered by `rg --files tests | rg "apiAuth|auth"`.

---

### Task 2: Extend the admin Users API and add safe user details

**Files:**
- Modify: `src/app/api/admin/users/route.js`
- Create: `src/app/api/admin/users/[id]/route.js`
- Create: `src/lib/adminUsers.js` for shared safe-field, summary, and payment-metadata helpers
- Test: `tests/api/adminFeatureControls.test.js` for list contract extensions
- Create: `tests/api/adminUsersDetail.test.js`
- Test: `tests/lib/adminUsers.test.js`

**Interfaces:**
- `GET /api/admin/users` returns `{ users, total, page, pageSize, summary }`.
- A list user contains `id`, `email`, `name`, `avatar_url`, `tier`, `created_at`, `last_seen_at`, `sheetConnected`, and `isAdmin` only.
- `GET /api/admin/users/[id]` returns `{ user, usage, payments }` where `usage.transactions` includes current WIB period, current count, limit, resetAt, and `verified`; `payments` contains safe metadata and a boolean `hasProof`, never `proof_url`.
- `summary` contains `total`, `free`, `paid`, `active7d`, and `sheetConnected`.

- [ ] **Step 1: Write failing list-route tests for pagination, summaries, activity filters, and safe fields.**

Assert that `page=2&pageSize=25&activity=7d&sheet=connected` applies the expected query/range operations, returns `total/page/pageSize/summary`, annotates admin users, and strips `spreadsheet_id` from the response. Add validation tests for unsupported page sizes and activity values.

- [ ] **Step 2: Run the list-route tests and verify the new contract fails.**

Run: `npm.cmd test -- --run tests/api/adminFeatureControls.test.js`  
Expected: FAIL on the new response fields and filter assertions.

- [ ] **Step 3: Implement the list data access.**

Keep the existing safe search and tier/date filters. Add validated `page`, `pageSize`, `activity`, `sheet`, and `sort` handling; query only safe user columns; query admin emails separately and normalize them; calculate summary counts with count queries that never select spreadsheet IDs into the response; return `sheetConnected: Boolean(spreadsheet_id)` and remove the raw field before serialization.

- [ ] **Step 4: Write failing detail-route tests.**

Cover non-admin rejection, missing user 404, safe account metadata, current WIB transaction usage, Free limit/reset, Pro unlimited, payment metadata with `hasProof`, and the absence of `spreadsheet_id`/`proof_url`.

- [ ] **Step 5: Run the detail tests and verify they fail for the expected missing route.**

Run: `npm.cmd test -- --run tests/api/adminUsersDetail.test.js`  
Expected: FAIL because the detail route does not yet exist.

- [ ] **Step 6: Implement `src/lib/adminUsers.js` and the detail route.**

Use the existing `getCurrentMonthPeriod`, `getNextMonthlyResetAt`, `getUsage`, `getTierLimits`, and payment normalization patterns. Fetch payment rows by user ID with an explicit safe select; retain only payment ID, amount, status, created/reviewed times, reviewer/reason metadata already intended for admin history, and `hasProof: Boolean(proof_url)`.

- [ ] **Step 7: Run all focused API/helper tests.**

Run: `npm.cmd test -- --run tests/api/adminFeatureControls.test.js tests/api/adminUsersDetail.test.js tests/lib/adminUsers.test.js`  
Expected: PASS with zero failures.

---

### Task 3: Create the tabbed AdminShell and URL state

**Files:**
- Create: `src/app/admin/AdminShell.jsx`
- Modify: `src/app/admin/page.js`
- Modify: `src/app/admin/AdminPaymentsClient.jsx`
- Modify: `src/app/admin/AdminFeatureControls.jsx`
- Test: `tests/components/AdminFeatureControls.test.jsx`
- Create: `tests/components/AdminShell.test.jsx`

**Interfaces:**
- `AdminShell` owns `tab`, optional `user`, and the shared `notify({ message, detail, tone })` state.
- Tabs are `payments`, `users`, and `features`; invalid URL values fall back to `payments`.
- `AdminFeatureControls` accepts an optional `onSuccess(message)` callback while retaining its existing local status text.
- `AdminPaymentsClient` renders tab content without creating a competing page-level `<main>` wrapper.

- [ ] **Step 1: Write failing shell tests for default tabs, URL state, and accessible tab semantics.**

Test that no query opens Payments, `?tab=users` opens Users, `?tab=features` opens Feature Controls, clicking a tab updates the query string, and `?tab=users&user=id` passes the selected ID into the Users client.

- [ ] **Step 2: Run the shell test and verify it fails because `AdminShell` is missing.**

Run: `npm.cmd test -- --run tests/components/AdminShell.test.jsx`  
Expected: FAIL with the shell module unavailable.

- [ ] **Step 3: Implement the shell and move the page wrapper.**

Use `useSearchParams`, `useRouter`, and a single `router.replace` helper that preserves unrelated query parameters. Render a shared admin header, three keyboard-accessible tabs, and the active client section. Keep the Payments default visible when the query is missing or invalid.

- [ ] **Step 4: Wire Feature Controls success callbacks.**

After each successful global toggle, schedule write, or selected-user override, call `onSuccess` with the action-specific Indonesian message. Keep the existing inline `role="status"` message as the persistent section-level confirmation.

- [ ] **Step 5: Run shell and existing feature-control tests.**

Run: `npm.cmd test -- --run tests/components/AdminShell.test.jsx tests/components/AdminFeatureControls.test.jsx`  
Expected: PASS with zero failures.

---

### Task 4: Build the Users directory and read-only detail panel

**Files:**
- Create: `src/app/admin/AdminUsersClient.jsx`
- Create: `src/app/admin/AdminUserDetailsPanel.jsx`
- Create: `src/app/admin/adminFormatters.js`
- Modify: `src/app/admin/AdminShell.jsx`
- Create: `tests/components/AdminUsersClient.test.jsx`
- Create: `tests/components/AdminUserDetailsPanel.test.jsx`

**Interfaces:**
- `AdminUsersClient({ selectedUserId, onSelectUser, onCloseUser, onNavigate })` owns list/filter/pagination state and fetches `/api/admin/users`.
- `AdminUserDetailsPanel({ userId, onClose, onNavigate })` independently fetches `/api/admin/users/[id]` and renders account, usage, payments, and links.
- Proof buttons navigate to `/api/admin/payments/{paymentId}/proof`; proof URLs are not fetched through the user-detail JSON response.

- [ ] **Step 1: Write failing component tests for the Users tab.**

Cover automatic initial fetch, summary cards, rows with Admin/Sheet/last-active labels, 25/50/100 page-size choices, activity/tier/sheet filters, manual Refresh, empty/error/retry states, and URL selection callback.

- [ ] **Step 2: Run the Users component tests and verify they fail because the component is missing.**

Run: `npm.cmd test -- --run tests/components/AdminUsersClient.test.jsx`  
Expected: FAIL with the Users client module unavailable.

- [ ] **Step 3: Implement the directory with responsive table/card rendering.**

Use a compact table on desktop and stacked cards on mobile. Keep the selected row highlighted, show `Belum tercatat` for null activity, and keep list refresh read-only. Use `AbortController` or request sequencing so an older filter response cannot replace a newer result.

- [ ] **Step 4: Write failing detail-panel tests.**

Cover independent loading states, account metadata, safe transaction usage, payment history with proof button, private Sheet explanation, navigation links, section-level errors with Retry, Escape/close behavior, and no mutation controls.

- [ ] **Step 5: Run detail-panel tests and verify the expected missing behavior.**

Run: `npm.cmd test -- --run tests/components/AdminUserDetailsPanel.test.jsx`  
Expected: FAIL on the new panel behavior.

- [ ] **Step 6: Implement the side panel and shell navigation.**

Use a desktop right panel and mobile full-screen dialog. Set `role="dialog"`, `aria-modal`, labelled heading, Escape handling, and focus return. Load account, usage, and payments as separate promises so a failed section retains the successful sections.

- [ ] **Step 7: Run both Users component test files.**

Run: `npm.cmd test -- --run tests/components/AdminUsersClient.test.jsx tests/components/AdminUserDetailsPanel.test.jsx`  
Expected: PASS with zero failures.

---

### Task 5: Add feature-flag toast and persistent change metadata

**Files:**
- Create: `src/app/admin/AdminToast.jsx`
- Modify: `src/app/admin/AdminShell.jsx`
- Modify: `src/app/admin/AdminFeatureControls.jsx`
- Modify: `tests/components/AdminFeatureControls.test.jsx`
- Modify: `tests/components/AdminShell.test.jsx`

**Interfaces:**
- `AdminToast({ notice, onClose })` renders a non-blocking top-right success toast with `role="status"`.
- Feature rows render `updatedAt` and `updatedBy` when available, formatted in WIB.

- [ ] **Step 1: Add failing assertions for toast invocation and row metadata.**

After a mocked successful global toggle, assert that the feature row displays the updated timestamp/admin and that the shell receives a success message containing the feature and new state. Assert that failed requests do not update either state.

- [ ] **Step 2: Run the focused component tests and verify the new assertions fail.**

Run: `npm.cmd test -- --run tests/components/AdminFeatureControls.test.jsx tests/components/AdminShell.test.jsx`  
Expected: FAIL because no shared toast callback/metadata UI exists.

- [ ] **Step 3: Implement the toast with five-second dismissal and manual close.**

Use an effect keyed by the current notice to clear it after 5000ms, clear the timer on unmount, and preserve `role="status"`. Do not replace the inline section status or turn errors into success toasts.

- [ ] **Step 4: Render feature change metadata and connect all mutation paths.**

Show `Diperbarui <WIB date> oleh <email>` for global rows; after a successful local mutation update the row with the server response/refreshed metadata where available. Keep the existing OFF confirmation and disabled protected flags.

- [ ] **Step 5: Run the focused tests.**

Run: `npm.cmd test -- --run tests/components/AdminFeatureControls.test.jsx tests/components/AdminShell.test.jsx`  
Expected: PASS with zero failures.

---

### Task 6: Synchronize documentation and progress records

**Files:**
- Modify: `docs/Flow-system.md`
- Modify: `progress.md`

- [ ] **Step 1: Add the new admin flow to `docs/Flow-system.md`.**

Document the three tabs, safe Users directory, read-only detail panel, click-to-view proof boundary, transaction-only admin quota visibility, last-active semantics, and success-toast/row-metadata behavior. Keep the existing Phase 4 feature-flag security statements intact.

- [ ] **Step 2: Append a dated `2026-08-02` progress entry.**

Record files changed, the approved decisions, the last-active write guard, and verification results. Do not rewrite historical entries or update the commercialization prompt packet.

- [ ] **Step 3: Run `git diff --check`.**

Run: `git diff --check`  
Expected: exit 0 with no whitespace errors.

---

### Task 7: Full verification and review

**Files:**
- No new production files; inspect all files changed by Tasks 1–6.

- [ ] **Step 1: Run the full Vitest suite.**

Run: `npm.cmd test`  
Expected: exit 0 with zero failed test files. Record the exact passed/skipped counts.

- [ ] **Step 2: Run the production build.**

Run: `npm.cmd run build`  
Expected: exit 0 with a completed Next.js production build and no admin-route compile errors.

- [ ] **Step 3: Inspect the final diff and sensitive-field boundaries.**

Run: `git diff --check`; `rg -n "spreadsheet_id|proof_url|accessToken" src/app/api/admin/users src/app/admin`  
Expected: no sensitive field is serialized by the new Users API/client; the existing proof route may retain its private server-side lookup.

- [ ] **Step 4: Dispatch a code-review subagent for the final diff.**

Give the reviewer the approved spec, the final changed-file list, and the base/HEAD SHAs. Fix Critical and Important findings before claiming completion.

- [ ] **Step 5: Report verification evidence and remaining limitations.**

Include the exact test/build commands and outcomes, note that Sheet-backed record counts remain intentionally unavailable to admin, and do not claim live deployment verification unless it is run separately.
