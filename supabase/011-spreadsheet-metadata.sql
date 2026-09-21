-- Spreadsheet connection metadata (Wave 2 ownership hub). This is connection
-- info about the user-owned Google Sheet, not financial ledger data.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spreadsheet_name TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spreadsheet_url TEXT;

COMMENT ON COLUMN users.spreadsheet_name IS
  'Google-provided title of the connected user-owned spreadsheet, shown in the Google Sheets Anda card; nullable because legacy connections backfill it lazily.';

COMMENT ON COLUMN users.spreadsheet_url IS
  'Google-provided webViewLink of the connected user-owned spreadsheet used for Buka di Google Sheets; nullable because legacy connections backfill it lazily.';
