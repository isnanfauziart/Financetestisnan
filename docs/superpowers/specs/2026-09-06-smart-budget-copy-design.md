# Smart Anggaran — Historical Copy Design

## Outcome

Add a compact **Salin Anggaran** flow that lets Artami users reuse budget rows from any historical month for a different month, review each row, edit copied limits, and save the complete selection in one operation.

## Approved product behavior

- The feature is available to Free and Paid/Admin users.
- The user can choose any historical month that contains budgets as the source.
- The destination defaults to the dashboard-selected month/year and remains editable.
- The source and destination period must differ.
- The source list defaults to the most recent month containing budgets.
- Nothing is selected initially; **Pilih semua** selects all eligible rows.
- The user may select individual rows and edit each copied limit.
- Category and account are copied; notes are blank.
- Existing destination rows with the same `Kategori | Bulan | Tahun | Akun` key are not overwritten and appear disabled as **Sudah ada**.
- Inactive/archived categories and invalid legacy amounts are disabled with a reason.
- Free users are limited by the existing three-budget-per-destination-month rule. Paid/Admin users remain unlimited.
- If **Pilih semua** exceeds remaining Free slots, all rows may remain selected for review but saving is disabled until the selection fits.
- The complete selection is validated and written as one server-side batch. A validation, quota, duplicate, or write failure must not intentionally produce a partial batch.
- The UI preserves selections and edits after recoverable errors, refreshes destination data before retrying an ambiguous write, and reports success only after the server confirms the batch.

## User interface

Add **Salin Anggaran** next to the existing **Tambah Anggaran** action in `BudgetsSection`. The action opens one compact sheet (`BudgetCopyModal`) containing:

1. Source month/year selector, defaulting to the latest historical period with budgets.
2. Destination month/year selector, defaulting to the selected dashboard period.
3. A source-row list with unchecked checkboxes, category/account labels, editable limit fields, duplicate/inactive/invalid states, and a **Pilih semua** control.
4. A selected-count / remaining-slot status line.
5. A disabled-or-enabled save action labelled with the selected count.

On success, close the sheet, refresh shared budget data and usage, and show an Indonesian success toast. On failure, keep the sheet open and retain the current selection.

## Server architecture

Create a dedicated `POST /api/budgets/copy` route. Keep existing single-row Budget CRUD behavior unchanged.

The request contains the source period, destination period, and selected source keys with edited limits. The server authenticates and feature-gates the request, reloads the full Budgets sheet while holding the existing per-user feature creation lock, verifies the selected rows against the source period, validates positive limits and period differences, detects destination composite-key collisions, and enforces the complete target-month Free quota. It then appends all new rows in one Sheets request with blank notes.

No new Supabase table, migration, Google Sheets tab, recurring scheduler, AI recommendation, or template model is part of this version.

## Error and accessibility behavior

- No source budgets: show an explanatory empty state and retain the existing manual-create action.
- Duplicate destination row: disable it and explain **Sudah ada**.
- Quota exceeded or unverifiable: keep selection, disable save, and show a retry/upgrade-safe message.
- Stale source/destination state: reject the complete batch and ask the UI to refresh.
- Sheets/network error: retain the sheet state and require a refreshed destination before retry.
- Use labelled checkboxes and inputs, live status text for counts/errors, keyboard access, and existing 44px touch targets.

## Verification

Focused API tests cover authentication, feature flags, source tampering, same-period rejection, duplicate detection, Free/ Paid quota boundaries, concurrent serialization, invalid values, and single-call multi-row writes. Component tests cover default periods, manual selection, **Pilih semua**, editable limits, disabled states, quota messaging, error retention, success refresh, and accessibility labels. The final gate is an independent diff review, the full test suite, a production build, and `git diff --check`.
