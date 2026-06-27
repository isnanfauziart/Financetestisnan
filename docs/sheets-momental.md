# Momental (Event Budget) Tab Schema

**Tab name:** `Momental` (case-sensitive)

## Columns A–K

| Col | Header | Type | Required | Notes |
|-----|--------|------|----------|-------|
| A | `ID` | string | auto | Auto-generated via `Date.now()` |
| B | `Nama` | string | yes | Display name (e.g. "Anak Masuk Sekolah 2026") |
| C | `Tipe` | string | yes | `anak-sekolah`, `lebaran-thr`, or `custom` |
| D | `TanggalMulai` | string | yes | ISO date `YYYY-MM-DD` |
| E | `TanggalSelesai` | string | yes | ISO date `YYYY-MM-DD` |
| F | `TotalBudget` | number | yes | Plain integer, total spending envelope |
| G | `Mode` | string | yes | `independent` (default) or `exempt` (excluded from monthly budgets) |
| H | `Status` | string | yes | `planning`, `active`, `completed`, `archived` |
| I | `DanaTHR` | number | optional | Expected THR amount (for Lebaran events only) |
| J | `Catatan` | string | optional | Free-text notes |
| K | `CreatedAt` | string | auto | ISO date `YYYY-MM-DD`, auto-generated on POST |

## Event Types (Tipe)

- `anak-sekolah` — Anak Masuk Sekolah (school enrollment)
- `lebaran-thr` — Lebaran / THR (Eid al-Fitr)
- `custom` — User-defined event

## Modes

- `independent` — Event-tagged transactions ALSO count toward monthly category budgets (default)
- `exempt` — Event-tagged transactions are EXCLUDED from monthly budget calculations (for large one-time items)

## Statuses

- `planning` — Before start date. Can tag transactions early.
- `active` — Within date range. Normal tracking.
- `completed` — Past end date. Read-only.
- `archived` — Hidden from main view.

---

# EventBudgets Tab Schema

**Tab name:** `EventBudgets` (case-sensitive)

## Columns A–F

| Col | Header | Type | Required | Notes |
|-----|--------|------|----------|-------|
| A | `EventID` | string | yes | References `Momental.ID` |
| B | `SubKategori` | string | yes | Sub-category name (e.g. "Seragam", "Zakat Fitrah") |
| C | `Limit` | number | yes | Plain integer, budget limit for this sub-category |
| D | `Icon` | string | optional | Lucide icon name |
| E | `Color` | string | optional | Hex color |
| F | `Catatan` | string | optional | Free-text notes |

---

# Transaction Sheet Extensions

Add columns N and O to `Pemasukan`, `Pengeluaran`, `Tabungan`:

| Col | Header | Type | Notes |
|-----|--------|------|-------|
| N | `EventID` | string | References `Momental.ID`. Empty = not tagged to any event. |
| O | `EventSubKategori` | string | Sub-category within the event. Empty if no event. |

---

## API Routes

- `GET /api/momental` — list all events with computed progress
- `POST /api/momental` — create event + auto-create sub-category rows
- `PUT /api/momental` — update event (find by ID)
- `DELETE /api/momental` — delete event (clear row + sub rows)
- `GET /api/momental/[id]` — single event with full transaction list
- `PUT /api/momental/[id]` — update event status
- `DELETE /api/momental/[id]` — delete single event
- `GET /api/momental/summary` — lightweight progress for Home card

## Transaction API Changes

- `POST /api/transaction` — accepts optional `eventId` and `eventSubKategori`
- `PUT /api/transaction/[id]` — preserves/updates `eventId` and `eventSubKategori`
