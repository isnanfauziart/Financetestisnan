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
| `startingBalance` | number | User's net worth before they started using the app (Rp) |

## How to create

1. Create a new tab named `Settings` in your Google Sheets spreadsheet
2. Row 1: `startingBalance` | `0`
3. When the user sets their saldo awal via the app, the value in column B updates

## Notes

- If the tab doesn't exist, the app falls back to `startingBalance = 0`
- Additional settings can be added as new rows (key-value pattern)
- The API reads all rows and returns them as a JSON object
