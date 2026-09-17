# Utang Sheet Schema

## Tab

`Utang`

## Columns A-M

Columns A–I are the original debt fields; J–M are additive financial-foundations metadata.

| Col | Field | Type | Required | Notes |
|---|---|---|---|---|
| A | `ID` | string | yes | Auto-generated id |
| B | `NamaOrang` | string | yes | Person related to the debt/receivable |
| C | `Jumlah` | number | yes | Original amount |
| D | `Arah` | string | yes | `utang` means user owes money; `piutang` means someone owes user |
| E | `JatuhTempo` | string | yes | `YYYY-MM-DD` |
| F | `Status` | string | yes | `open` or `settled` |
| G | `SisaSaldo` | number | yes | Remaining balance |
| H | `Catatan` | string | no | Optional note |
| I | `CreatedAt` | string | yes | ISO date |
| J | `EntryMode` | string | no | `new` (obligation + principal cash movement) or `historical` (obligation only). Blank legacy rows read as `historical` |
| K | `AkunBank` | string | no | Cash account affected by the principal movement (required for `new`) |
| L | `RecordedAt` | string | no | ISO timestamp of the last write |
| M | `OperationId` | string | no | Financial-write operation id that last touched the row |

The hidden `_ArtamiOperations` tab (columns A–D: `OperationId`, `Kind`, `RelatedId`, `CommittedAt`) records a receipt for every committed debt write; `RelatedId` references the affected `Utang!A<row>`.

## API

| Route | Method | Behavior |
|---|---|---|
| `/api/debts` | GET | List debts from `Utang!A:I` |
| `/api/debts` | POST | Create debt, or process a payment when `action` is payment |
| `/api/debts` | PUT | Update debt by row index/id |
| `/api/debts` | DELETE | Clear the debt row |

## Payment Behavior

- Payment reduces `SisaSaldo`.
- When `SisaSaldo` reaches 0, `Status` becomes `settled`.
- Paying `utang` creates an expense transaction with category `Utang`.
- Receiving `piutang` creates an income transaction with category `Piutang`.
- Transaction writes use the current user's `spreadsheetId`; no shared sheet is used.
