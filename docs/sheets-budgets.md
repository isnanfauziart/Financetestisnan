# Google Sheets Schema — Budgets Tab

This tab stores **per-category monthly budgets** for Phase A of the Goals update.

## Tab name
`Budgets` (case-sensitive — must match exactly)

## Required columns (A–F)

| Col | Header | Type | Notes |
|---|---|---|---|
| A | `Kategori` | string | Must match one of the expense categories in `src/app/dashboard/_components/constants.js` → `EXPENSE_CATEGORIES`. Case-sensitive. |
| B | `Bulan` | string | Indonesian 3-letter month: `Jan`, `Feb`, `Mar`, `Apr`, `Mei`, `Jun`, `Jul`, `Agu`, `Sep`, `Okt`, `Nov`, `Des`. **Note:** August is `Agu`, not `Ags`. |
| C | `Tahun` | number | 4-digit year, e.g. `2026` |
| D | `Limit` | number | Plain integer (no `Rp`, no thousand separators, no decimal). E.g. `500000` for Rp 500,000. |
| E | `Akun` | string (optional) | Bank account this budget applies to. Must match one of `BANK_ACCOUNTS` if filled (e.g. `Bank BCA`). **Leave empty** to apply to all accounts. |
| F | `Catatan` | string (optional) | Free-text note. |

## Composite key
A budget is uniquely identified by **`Kategori | Bulan | Tahun | Akun`**. The API uses this to find/update/delete rows.

## Sample rows

```
Kategori        | Bulan | Tahun | Limit   | Akun      | Catatan
Makan di luar   | Jun   | 2026  | 500000  |           | Weekly dining cap
Transportasi    | Jun   | 2026  | 300000  | Bank BCA  | Commute + ojol
Jajan           | Jun   | 2026  | 150000  |           |
Hiburan         | Jun   | 2026  | 200000  |           | Netflix, spotify, etc
```

## Behavior

- **No account (`Akun` empty)** → budget applies to all accounts for that category+month.
- **Specific account** → budget applies only to that account. The UI shows both: account-less budgets (always) + account-specific budgets (when filter matches).
- **No row for a category in a given month** → that category is treated as "unbudgeted". The UI shows a subtle "Set budget?" pill.

## Categories whitelist
Categories must match `EXPENSE_CATEGORIES` exactly:
```
Transportasi, Sedekah, Elektronik, Healthcare, Utang, Body Care,
Musibah, Kondangan, Makan di luar, Makan di rumah, Hiburan, Jajan,
Skincare, Belanja, Laundry, Ilmu, Pakaian, Tabungan Cash
```

## Bank accounts whitelist
If filling `Akun`, must match `BANK_ACCOUNTS` exactly:
```
Cash, Bank BCA, Bank BNI, Bank BRI, Bank Mandiri, OVO, DANA, ShoopePay, Gopay, BSI, Other Bank
```

## Setup steps

1. In your spreadsheet, click **+** at the bottom to add a new sheet
2. Name it `Budgets`
3. In row 1, add the headers above (one per column, A through F)
4. In row 2+, add your budget rows
5. The first time you add a budget, the header row is auto-detected by the API (row 1 is treated as header, data starts at row 2)
