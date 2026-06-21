# Utang (Debts & Loans) Sheet Schema

## Tab name: `Utang`

## Columns

| Col | Field | Type | Required | Description |
|-----|-------|------|----------|-------------|
| A | ID | string | yes | Auto-generated (`Date.now()`) |
| B | NamaOrang | string | yes | Person's name |
| C | Jumlah | number | yes | Original total amount |
| D | Arah | string | yes | `utang` (you owe) or `piutang` (they owe you) |
| E | JatuhTempo | string | yes | Due date (`YYYY-MM-DD`) |
| F | Status | string | yes | `open` or `settled` |
| G | SisaSaldo | number | yes | Remaining balance (decreases with payments) |
| H | Catatan | string | no | Optional notes |
| I | CreatedAt | string | yes | Auto-generated (`YYYY-MM-DD`) |

## Notes

- When `SisaSaldo` reaches 0, status auto-changes to `settled`
- Payments auto-create expense transactions with category "Utang"
- The "Utang" expense category in `constants.js` is kept as-is for transaction categorization
