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
| `startingBalanceDate` | string | Date when startingBalance was recorded (`YYYY-MM-DD`). Only transactions from this date forward count toward net worth. |

## How to create

1. Create a new tab named `Settings` in your Google Sheets spreadsheet
2. Row 1: `startingBalance` | `0`
3. Row 2: `startingBalanceDate` | `2026-01-01`
4. When the user sets their saldo awal via the app, both values update

## Notes

- If the tab doesn't exist, the app falls back to `startingBalance = 0` and `startingBalanceDate = ""`
- Net worth = startingBalance + Σ(income - expense) for months >= startingBalanceMonth
- Historical transactions are still visible in charts and insights — just not counted toward net worth
- Additional settings can be added as new rows (key-value pattern)
