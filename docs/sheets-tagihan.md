# Tagihan Tab Schema

**Tab name:** `Tagihan` (case-sensitive)

## Columns A–N

| Col | Header | Type | Required | Notes |
|-----|--------|------|----------|-------|
| A | `ID` | number | auto | Auto-generated via `Date.now()` |
| B | `Nama` | string | yes | Display name (e.g. "PLN Rumah") |
| C | `Jumlah` | number | yes | Plain integer, no `Rp`/separators/decimal |
| D | `Tipe` | string | yes | `expense` or `income` |
| E | `KategoriBill` | string | yes | Bill's own category (e.g. "Listrik", "Netflix") |
| F | `KategoriTransaksi` | string | yes | Maps to `EXPENSE_CATEGORIES` or `INCOME_CATEGORIES` for auto-create |
| G | `Frekuensi` | string | yes | `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly` |
| H | `TanggalJatuhTempo` | number | yes | Day of month (1–31) for monthly; day of week (1=Mon, 7=Sun) for weekly |
| I | `AkunBank` | string | optional | Must match `BANK_ACCOUNTS`; empty = no account |
| J | `Aktif` | string | yes | `TRUE` (default) or `FALSE` |
| K | `TerakhirDibayar` | string | optional | ISO date `YYYY-MM-DD` of last payment |
| L | `Catatan` | string | optional | Free-text note |
| M | `CreatedAt` | string | auto | ISO date, auto-generated on POST |
| N | `Sumber` | string | optional | `recurring:v1|v2:<key>` fingerprint of the recurring-expense stream this bill was converted from; empty for manually created bills |

## Sumber (column N)

Written once at conversion time by the recurring-expense radar. It links the
bill to its originating expense stream so the cash-flow forecast counts that
spending exactly once (as a scheduled bill, not also as historical variable
spending). The value is preserved on bill updates and payments. Deleting or
deactivating the bill restores the stream's history into the forecast baseline.

## Bill Categories (KategoriBill)

Listrik, Air (PDAM), Internet/WiFi, Pulsa & Data, BPJS Kesehatan, BPJS Ketenagakerjaan, Asuransi, Sewa Rumah, Cicilan/Kredit, Netflix, Spotify, YouTube Premium, Gym, Arisan, Other

## Frequency Values

- `weekly` — every week
- `biweekly` — every 2 weeks
- `monthly` — every month (day of month = TanggalJatuhTempo)
- `quarterly` — every 3 months
- `yearly` — every year

## Auto-Categorization Mapping

When a bill is paid ("Bayar"), a transaction is auto-created using `KategoriTransaksi` as the category:

| KategoriBill | KategoriTransaksi (expense) |
|---|---|
| Listrik | Tagihan |
| Air (PDAM) | Tagihan |
| Internet/WiFi | Tagihan |
| Pulsa & Data | Tagihan |
| BPJS Kesehatan | Healthcare |
| BPJS Ketenagakerjaan | Healthcare |
| Asuransi | Healthcare |
| Sewa Rumah | Tagihan |
| Cicilan/Kredit | Utang |
| Netflix | Hiburan |
| Spotify | Hiburan |
| YouTube Premium | Hiburan |
| Gym | Healthcare |
| Arisan | Tabungan Cash |
| Other | Tagihan |

For income bills, `KategoriTransaksi` maps to `INCOME_CATEGORIES` directly.

## API Routes

- `GET /api/bills` — list all active bills with computed `daysUntilDue` and `status`
- `POST /api/bills` — create new bill
- `PUT /api/bills/[id]` — update bill by ID
- `DELETE /api/bills/[id]` — delete bill by ID
- `POST /api/bills/pay` — pay a bill (auto-creates transaction + updates TerakhirDibayar)
