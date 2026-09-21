# Wave 3 — Recurring-expense and bill reconciliation

Date: 2026-09-19 · Source: `docs/2026-09-09-product-improvement-roadmap.md` → Wave 3 (line 876) · Risk: High

## Task contract

**Outcome:** A converted recurring expense contributes exactly one future obligation to the forecast; its historical occurrences stay visible in reports/actual totals but stop feeding the variable baseline; ambiguous matches are never silently resolved.

**Included**
1. **Durable link on the bill.** Additive Tagihan column **N = `Sumber`**: grid expanded 13→14 with a `Sumber` header (modeled on the existing `ensureExpenseClassHeader` pattern; a conflicting existing header fails closed as schema conflict). `rowToBill` reads N as `sourceFingerprint`; bills POST/PUT persist a validated fingerprint (`recurring:` prefix + length cap, same rules as dismissal fingerprints) in the same appended/updated row — one write, no composite half-state.
2. **Forecast reconciliation.** `computeForecast` excludes historical routine expenses whose recomputed fingerprint matches an **aktif** bill's stored `Sumber` value (in addition to the `billpay:` exclusion), then adds each scheduled bill once via the existing `scheduledBillTotals`. Deleting or disabling a bill restores its history into the baseline and removes only the scheduled contribution.
3. **Ambiguity as a visible state.** A candidate that partially matches an existing bill (name matches, category/account differ) is no longer silently dropped: it returns with `needsReview: true`, the radar shows **Perlu ditinjau** with the Tambah action disabled, and no history is removed from any baseline. Full matches keep suppressing the candidate as today — now additionally by stored fingerprint, so suppression survives renames.
4. **Copy, not identifiers.** Bill detail shows the source in plain Indonesian ("Terjadwal dari pengeluaran rutin"); the forecast explanation states that already-scheduled routine spending is counted once — no `recurring:v1:…` strings in product copy. Bill payments stay replay-safe through the existing operation ID (focused check only).

**Exclusions:** no manual expense-to-bill linking; no changes to the `billpay:` ID scheme; no new endpoints (fingerprint rides the existing bills POST/PUT body); no dismissal-behavior changes; no edits to conversion quota gates.

**Protected invariants:** actual totals/reports/history never lose the historical occurrences (exclusion is forecast-only); fingerprint writes fail closed on schema conflict; conversion goes through the existing bills quota gate; Free/Pro gating untouched; pending/stale/unresolved write-gate semantics from Waves 1–2 remain intact.

## Batches

| Batch | Scope | Focused checks |
|---|---|---|
| **A** — schema + persistence | `sheets.js`/`bills.js` (`ensureBillSourceColumn`), `rowToBill`, `bills/route.js` (GET range A:N, POST/PUT persist + validate), `bills/[id]/route.js` | Grid expansion + header write; conflicting header refuses; POST carries fingerprint on the same row; legacy 13-column bills keep reading; repeated conversion returns 409 |
| **B** — forecast reconciliation | `forecast.js` (fingerprint-based historical exclusion alongside `billpay:`), `recurringExpenses.js` (`needsReview` partial matches), `scheduledBillTotals` aktif-only verification | Confident match, ambiguous match, dismissed candidate, converted bill with historical payments, repeated conversion, deletion/disablement, duplicate payment (existing suite), failed write |
| **C** — UI + copy | `RecurringExpenseRadar.jsx` (Perlu ditinjau state), `BillsSection.jsx`/`BillSetupModal.jsx` (fingerprint on convert, detail copy), forecast explanation copy | Radar states, detail copy assertions, explanation copy has no implementation identifiers |

**Verification gate:** one independent diff review, then full Vitest suite, production build, `git diff --check`, `progress.md` entry — same as Waves 1–2.
