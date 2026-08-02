# Artami Admin Workspace Revamp Design

**Date:** 2026-08-02  
**Status:** Approved for implementation  
**Scope:** `/admin` success feedback and read-only user directory

## Goal

Make the admin area easier to operate by giving it a clear tabbed workspace, visible success confirmation for feature-flag changes, and a user directory that can be browsed without already knowing a user email.

## Approved product decisions

- The admin workspace has three top-level tabs: `Pembayaran`, `Pengguna`, and `Kontrol Fitur`. Payments is the default tab.
- The selected tab and selected user are represented in the URL with query parameters so refresh, Back, and direct links preserve the view.
- The Users tab loads automatically, uses server-side pagination, shows newest users first, and supports 25/50/100 rows per page.
- Users can be searched and filtered by name/email, tier, registration date, Google Sheet connection, and activity windows: 24 hours, 7 days, 30 days, and never recorded.
- The directory summary shows total users, Free users, Pro users, users active in the last 7 days, and users with a connected Google Sheet.
- User rows show name, email, tier, Admin badge when applicable, Sheet connection status, last active time, and registration date.
- Clicking a user opens a read-only detail panel. Desktop uses a right-side panel; mobile uses a full-screen panel.
- The detail panel includes account metadata, safely verifiable transaction usage, payment history, secure click-to-view proof links, and links back to the Payments and Feature Controls tabs. It does not perform mutations.
- Pro users show unlimited transaction usage. Free users show current WIB-month transaction usage, the limit, and the reset date.
- Budgets, goals, debts, Momental events, and bills remain private Sheet-backed counts. The admin panel explains that these counts are not read live because the admin does not have the user's Google access token.
- Payment proof remains private. The panel displays payment metadata and loads a five-minute signed proof URL only after the admin explicitly requests it.
- `last_seen_at` represents authenticated Artami use, including opening the authenticated dashboard. Server activity is detected on authenticated requests but persisted only when the stored timestamp is older than five minutes. The admin Refresh button only reads the latest value and never writes activity for the selected user.
- Existing service-worker/background checks are excluded from activity semantics.
- Every successful feature-flag mutation shows a top-right success toast for approximately five seconds and updates persistent row metadata with the latest change time and admin email. Errors do not optimistically change the row.
- The Users panel loads account, usage, and payments independently. A failed section shows its own Retry action without hiding successful sections.
- The interface uses accessible status/alert announcements, keyboard-friendly tabs, dialog focus management, Escape-to-close, responsive layouts, loading states, empty states, and retryable errors.

## Architecture

The current stacked `/admin` page becomes an `AdminShell` that owns the active tab, URL state, shared toast, and common loading/error behavior. Payments, Users, and Feature Controls remain bounded client sections. Existing payment-review and feature-control business logic stays in its current areas unless a small extraction is required to connect it to the shell.

The Users feature is split into a directory client, summary/filter controls, a paginated table, and a read-only detail panel. The server exposes a paginated safe-list response and a user-detail response. Neither response contains access tokens, spreadsheet IDs, private proof paths, or ledger rows.

## Server contracts

### `GET /api/admin/users`

The route remains admin-only and gains validated pagination, sorting, activity and Sheet filters, total count, and summary counts. List rows contain only safe directory fields. The default sort is newest registration first.

### `GET /api/admin/users/[id]`

The route is admin-only and returns safe account metadata, Admin status, Sheet connection boolean, last-active value, transaction usage for the current WIB month, tier-aware transaction limit/reset metadata, and payment history metadata. It does not return the user's spreadsheet ID or payment proof storage path.

### Existing proof route

`GET /api/admin/payments/[id]/proof` remains the single proof-viewing boundary. It validates the admin session, creates a short-lived signed URL, and redirects the viewer without exposing the storage path to the Users API.

### Activity persistence

A Supabase migration adds nullable `users.last_seen_at` and an index suitable for activity filters. The authenticated request path performs a guarded update only when the previous value is older than five minutes. Existing users with no recorded activity display `Belum tercatat`.

## Interaction behavior

- Turning a feature OFF still requires the existing confirmation dialog.
- A successful global toggle, schedule, or selected-user override updates local state only after the server responds successfully.
- Toast copy identifies the feature and scope; row metadata identifies when and by whom the latest change was made.
- Search/filter/pagination changes fetch the directory again. The Refresh button re-reads summary and list data.
- The selected user remains highlighted while the detail panel is open. Closing it removes the `user` URL parameter and returns focus to the row.
- A stale or direct feature-control link continues to use the existing disabled-feature behavior.

## Non-goals

- No user suspension, deletion, editing, Pro restoration, or feature mutation from the Users panel.
- No admin access to users' Google Sheets.
- No new usage snapshot system for Sheet-backed record counts.
- No separate `/admin/users/[id]` route in this iteration.
- No expanded analytics or activity history beyond the current last-active timestamp.

## Verification requirements

- API tests cover admin authorization, pagination, safe fields, filters, summaries, user detail, payment metadata, and failure behavior.
- Migration and activity helper tests cover nullable initial state, timestamp formatting, and five-minute write protection.
- Component tests cover tab/URL state, Users loading/empty/error/retry states, summary/filter behavior, detail-panel sections, secure proof link behavior, responsive close behavior, and feature toasts/row metadata.
- Existing payment review, feature-control, and security tests remain green.
- Run the full Vitest suite, production build, and `git diff --check` before reporting completion.
