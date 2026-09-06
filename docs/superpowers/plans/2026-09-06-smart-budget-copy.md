# Smart Anggaran Historical Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quota-safe historical budget-copy workflow that lets Artami users select, edit, and batch-copy existing monthly budgets without overwriting destination rows.

**Architecture:** Keep the existing single-budget CRUD route unchanged and add `POST /api/budgets/copy`. The new route reloads the user’s complete Budgets sheet while holding the existing feature-creation lock, validates the entire request, and appends all rows in one Sheets request. A new compact client sheet consumes all-budget data, computes duplicate/inactive/quota states, and submits only after review.

**Tech Stack:** Next.js 14 App Router, React 18 JavaScript, Google Sheets API, Supabase service-role creation lock, Vitest, Testing Library, Tailwind utility classes, existing `Sheet` and shared budget cache.

## Global Constraints

- Finance data stays in each user’s Google Sheet; do not add a Supabase table or Google Sheets tab.
- Free users keep the existing limit of three budget rows per destination month; Paid/Admin users remain unlimited.
- Existing destination composite keys `Kategori | Bulan | Tahun | Akun` are never overwritten.
- Copy category, limit, and account; write an empty note.
- Source rows are historical user data; do not add recurring creation, templates, AI recommendations, or transaction-history expansion.
- Preserve unrelated dirty worktree changes and stage only task-owned files.
- Use Indonesian user-facing copy and existing 44px touch-target/accessibility conventions.
- Run focused checks after each batch; after the final review run the full suite, one production build, and `git diff --check`.

---

### Task 1: Batch quota contract and copy validation helpers

**Files:**
- Modify: `src/lib/recordQuota.js`
- Create: `src/lib/budgetCopy.js`
- Modify: `tests/lib/recordQuota.test.js`
- Modify: `tests/lib/recordQuotaLock.test.js`
- Create: `tests/lib/budgetCopy.test.js`

**Interfaces:**
- `runRecordCreation(auth, feature, options, create)` remains backward-compatible and delegates to a new `runRecordCreations(auth, feature, options, count, create)`.
- `runRecordCreations` calls `create(rows)` only when the complete `count` fits the feature quota while holding one creation lock.
- `budgetCompositeKey(kategori, bulan, tahun, akun)` returns a stable normalized composite key.
- `validateBudgetCopyBody(body)` returns `{ errors, source, destination, items }` with trimmed month/year strings and normalized items.

- [ ] **Step 1: Write failing quota tests.** Add cases proving a Free batch of two succeeds with one remaining slot denied, a Paid batch bypasses counting, and the lock releases when the batch callback throws. Keep existing single-row expectations unchanged.

```js
const response = await runRecordCreations(auth, "budgets", { month: "Sep", year: "2026" }, 2, create)
expect(response.status).toBe(403)
expect(create).not.toHaveBeenCalled()
```

- [ ] **Step 2: Write failing pure-helper tests.** Cover valid periods/items, same source/destination rejection, missing selection, non-positive limits, duplicate item keys, and stable composite keys that distinguish account-scoped rows.

```js
expect(validateBudgetCopyBody({
  source: { bulan: "Agu", tahun: "2026" },
  destination: { bulan: "Sep", tahun: "2026" },
  items: [{ rowIndex: 3, kategori: "Jajan", akun: "", limit: 500000 }],
}).errors).toEqual([])
```

- [ ] **Step 3: Run focused tests and verify the new tests fail.**

Run: `npx.cmd vitest run tests/lib/recordQuota.test.js tests/lib/recordQuotaLock.test.js tests/lib/budgetCopy.test.js`

Expected: the new batch/helper assertions fail before implementation while existing assertions continue to run.

- [ ] **Step 4: Implement the minimal quota extension.** Add `runRecordCreations`, validate a positive integer count, reuse the current lock/entitlement flow, and reject when `current + count > FREE_LIMITS[feature]`. Make `runRecordCreation` call it with count `1` so all existing routes retain their behavior.

- [ ] **Step 5: Implement `budgetCopy.js`.** Normalize/validate the body against `AVAILABLE_MONTHS`, four-digit years, non-empty item arrays, row indexes, non-empty categories, string accounts, finite positive limits, and unique source row indexes. Export `budgetCompositeKey` for the route and UI tests.

- [ ] **Step 6: Run the focused helper/quota tests to green.**

Run: `npx.cmd vitest run tests/lib/recordQuota.test.js tests/lib/recordQuotaLock.test.js tests/lib/budgetCopy.test.js`

- [ ] **Step 7: Commit the batch quota/helpers.**

```bash
git add -- src/lib/recordQuota.js src/lib/budgetCopy.js tests/lib/recordQuota.test.js tests/lib/recordQuotaLock.test.js tests/lib/budgetCopy.test.js
git commit -m "feat: add batch budget quota contract"
```

### Task 2: Historical copy API

**Files:**
- Create: `src/app/api/budgets/copy/route.js`
- Create: `tests/api/budgetCopyRoute.test.js`

**Interfaces:**
- `POST /api/budgets/copy` accepts:

```json
{
  "source": { "bulan": "Agu", "tahun": "2026" },
  "destination": { "bulan": "Sep", "tahun": "2026" },
  "items": [{ "rowIndex": 3, "kategori": "Jajan", "akun": "", "limit": 500000 }]
}
```

- Success returns `{ success: true, copied: number, destination: { bulan, tahun } }`.
- Invalid/stale/duplicate requests return a structured 400/409 error without calling Sheets append; quota failures reuse the existing 403/503 contract.

- [ ] **Step 1: Write failing route tests.** Mock `getAuthContext`, `featureUnavailableResponse`, `getSheetData`, `appendSheetValues`, and `runRecordCreations`. Cover unauthorized, feature-disabled, valid multi-row append with blank notes, source-row tampering, same-period rejection, duplicate destination collision, duplicate item indexes, and quota count passed to `runRecordCreations`.

```js
expect(appendSheetValues).toHaveBeenCalledWith(
  "token-1", "Budgets!A:F",
  [["Jajan", "Sep", "2026", 500000, "", ""]],
  "sheet-1", "USER_ENTERED",
)
```

- [ ] **Step 2: Run the route tests to confirm the new endpoint fails.**

Run: `npx.cmd vitest run tests/api/budgetCopyRoute.test.js`

Expected: module/handler assertions fail because the route does not yet exist.

- [ ] **Step 3: Implement the route.** Authenticate and feature-gate first; parse with `readJsonBody`/`validateBudgetCopyBody`; call `runRecordCreations` with the destination period and item count; inside the callback reload `Budgets!A:F`, verify each requested `rowIndex` still matches the source period/category/account, reject any destination composite-key collision or duplicate target key, build `[kategori, targetBulan, targetTahun, limit, akun, ""]` rows, and call `appendSheetValues` exactly once.

- [ ] **Step 4: Add stale-write and Sheets-error handling.** Return a 409 refresh-safe response for changed source/destination data and let the existing outer error contract return a safe 500 without leaking Sheets details. Do not issue any append before all rows pass validation.

- [ ] **Step 5: Run the route tests to green.**

Run: `npx.cmd vitest run tests/api/budgetCopyRoute.test.js tests/api/recordCreationGates.test.js`

- [ ] **Step 6: Commit the API batch.**

```bash
git add -- src/app/api/budgets/copy/route.js tests/api/budgetCopyRoute.test.js
git commit -m "feat: add historical budget copy API"
```

### Task 3: Compact copy sheet and Budgets integration

**Files:**
- Create: `src/components/BudgetCopyModal.jsx`
- Modify: `src/components/BudgetsSection.jsx`
- Modify: `tests/components/BudgetsSection.test.jsx`
- Create: `tests/components/BudgetCopyModal.test.jsx`

**Interfaces:**
- `BudgetCopyModal({ budgets, defaultMonth, defaultYear, expenseCategories, onClose, onSaved, proRegistrationOpen })` renders one `Sheet` and calls `onSaved(copiedCount)` only after a successful API response.
- `BudgetsSection` obtains an all-month `useBudgets("", "")` snapshot for the modal, adds the **Salin Anggaran** action, and refetches both current and all-month caches after success.

- [ ] **Step 1: Write failing component tests.** Cover the new header action, source defaulting to the latest period, destination defaulting to the selected period, unchecked rows, **Pilih semua**, editable amount fields, duplicate/inactive/invalid disabled rows, over-quota save blocking, preserved selections after API failure, accessible labels, and success callback.

```jsx
expect(screen.getByRole("button", { name: "Pilih semua" })).toBeInTheDocument()
expect(screen.getByRole("button", { name: /Salin 1 anggaran/i })).toBeDisabled()
```

- [ ] **Step 2: Run focused UI tests to confirm they fail.**

Run: `npx.cmd vitest run tests/components/BudgetsSection.test.jsx tests/components/BudgetCopyModal.test.jsx`

- [ ] **Step 3: Implement `BudgetCopyModal`.** Use `Sheet`, `SelectField`, `formatInputRupiah`, `QuotaNotice`, `useSettings`, and `budgetCompositeKey`. Derive sorted source periods, destination collisions, active category names, selected count, and remaining Free slots. Keep all checkboxes off initially, make **Pilih semua** toggle all eligible rows, preserve row edits by `rowIndex`, and submit the exact API contract from Task 2.

- [ ] **Step 4: Integrate `BudgetsSection`.** Add the copy action beside the existing create action, call `useBudgets("", "")` for source data, pass active expense categories and defaults, and refresh caches/usage plus show the Indonesian success toast after a successful copy.

- [ ] **Step 5: Run the focused component tests to green.**

Run: `npx.cmd vitest run tests/components/BudgetsSection.test.jsx tests/components/BudgetCopyModal.test.jsx`

- [ ] **Step 6: Commit the UI batch.**

```bash
git add -- src/components/BudgetCopyModal.jsx src/components/BudgetsSection.jsx tests/components/BudgetsSection.test.jsx tests/components/BudgetCopyModal.test.jsx
git commit -m "feat: add smart budget copy sheet"
```

### Task 4: Flow documentation and integration verification

**Files:**
- Modify: `docs/Flow-system.md`
- Modify: `progress.md`

- [ ] **Step 1: Document the new budget-copy route and user flow.** Add the endpoint to the route map and describe source selection, duplicate preservation, quota behavior, and batch validation. Do not change the Sheets schema because columns A–F remain unchanged.

- [ ] **Step 2: Append one chronological progress entry.** Record the feature, files, decisions, focused tests, final suite/build results, and any unrelated dirty-worktree blockers.

- [ ] **Step 3: Run the complete final verification.**

Run: `npx.cmd vitest run`

Expected: the full repository suite passes with the existing skip/warning baseline only.

Run: `npx.cmd next build`

Expected: production build completes using the repository’s documented temporary process values if local required variables are absent; no credentials are written.

Run: `git diff --check`

Expected: no whitespace errors in task-owned changes.

- [ ] **Step 4: Request one independent final diff review.** Give the reviewer the approved spec, this plan, the complete task-owned diff, focused-test evidence, and exclusions. Resolve only task-caused blocking findings, rerun affected focused checks, then report the final suite/build status.
