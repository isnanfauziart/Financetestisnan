# Settings Sheet Schema

## Tab name: `Settings`

## Structure

Key-value pairs. Each row is a setting.

| Col | Field | Type | Description |
|-----|-------|------|-------------|
| A | Key | string | Setting name |
| B | Value | string/number | Setting value |

## Current Settings

| Key | Type | Description |
|-----|------|-------------|
| `startingBalance` | number | User's net worth at the time of entry (Rp) |
| `startingBalanceDate` | string | Date when startingBalance was recorded (`YYYY-MM-DD`). Only transactions from this date forward count toward `Saldo Tercatat`. |
| `startingBalanceConfirmed` | boolean | `true` once the user completed opening-balance setup, so a valid Rp0 balance differs from incomplete setup. |
| `currentCashBalance` | number | Saved **Total saldo saat ini**: the combined bank, e-wallet, and cash balance at the moment it was saved (Rp). |
| `currentCashBalanceCheckpointId` | uuid | Checkpoint id minted when the balance was saved. Later cash movements inherit it, so same-day and historical rows are counted exactly once. A valid balance **and** id together mark a confirmed checkpoint; Rp0 with an id is confirmed. |
| `currentCashBalanceRecordedAt` | string | ISO timestamp of the last checkpoint save. |
| `financialFreedomMonthlyExpenseOverride` | positive integer | Optional monthly expense basis for the Target Bebas Finansial calculation (Rp). Blank clears it; maximum `999999999999`. |
| `categories_v1` | JSON string | Per-user active/archived expense, income, and savings categories. Savings entries include `savingsKind` (`liquid` or `investment`). |

`categories_v1` has the shape `{ expense: [], income: [], savings: [] }`. Each entry contains `name`, `icon`, and `active`; savings entries also contain `savingsKind`. `Utang` and `Piutang` are protected automated categories. New Artami-created Sheets receive the Indonesian starter set. Existing Sheets without this key continue using the legacy category lists until the user changes categories in Profile.

## How to create

1. Create a new tab named `Settings` in your Google Sheets spreadsheet
2. Row 1: `startingBalance` | `0`
3. Row 2: `startingBalanceDate` | `2026-01-01`
4. When the user sets their saldo awal via the app, both values update
5. The app may add `financialFreedomMonthlyExpenseOverride` when the user chooses a custom target basis. The automatic calculation uses actual completed months with recorded expenses; the override changes only the target, not the surplus or ETA basis.

## Notes

- If the tab doesn't exist, the app falls back to `startingBalance = 0` and `startingBalanceDate = ""`
- `Kekayaan Bersih` = `Saldo Tercatat` + outstanding Piutang − outstanding Utang, where `Saldo Tercatat` = startingBalance + cash income − cash expenses for months >= startingBalanceMonth
- `Saldo uang saat ini` = saved `currentCashBalance` + movements carrying the active `currentCashBalanceCheckpointId`; before a checkpoint exists the latest recorded balance is shown provisionally (**Berdasarkan data terakhir**)
- `Dana yang bisa dipakai saat ini` = max(0, `Saldo uang saat ini` − liquid savings reservations); unknown legacy savings classifications make the amount an estimate
- Historical transactions are still visible in charts and insights — just not counted toward `Saldo Tercatat`
- Additional settings can be added as new rows (key-value pattern)
