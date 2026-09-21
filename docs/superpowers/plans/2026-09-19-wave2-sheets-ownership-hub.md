# Wave 2 — Google Sheets ownership and recovery hub

**Source:** `docs/2026-09-09-product-improvement-roadmap.md` → Wave 2 (line 836).
**Risk:** High for the **Total saldo saat ini** and reconnect write paths; Medium for the status and ownership UI. One implementation owner.
**Approved:** 2026-09-19.

## Task contract

**Outcome:** A user can identify and open their exact Sheet from Profil, understands ownership/backup/deletion semantics and per-failure recovery in plain Indonesian — and a new login cannot write until fresh data has been fetched (or a known failure state replaces it).

**Included**
1. **Connection metadata.** Migration `011-spreadsheet-metadata.sql`: nullable `spreadsheet_name`, `spreadsheet_url` on `users`. `sheetManager.createUserSheet` returns `{ spreadsheetId, name, url }` from the Google create response; provisioning (`apiAuth.js`) and `connect-legacy-sheet` persist both (legacy resolves name/url via Drive `files.get`; metadata failure is non-fatal → lazy backfill). New `GET /api/sheets/connection` returns `{ connected, name, url, needsLegacyReconnect }` with tenant-scoped service-role access and lazy Drive backfill when the name is missing.
2. **Login freshness gate.** New `WRITE_BLOCK.pending` in `financialWriteState`: set when a session key appears with cached data (message "Memuat data terbaru…"); cleared by `markSynced`, replaced by `markStale`/`markSchemaConflict` on failure. Fresh-empty accounts are unaffected. SyncStatus shows pending as the checking label; all write gates block while pending.
3. **Google Sheets Anda card** in Profile, grouped with the existing **Total saldo saat ini** editor: file name, connection state reusing the Wave 1 write-state store, last successful sync, **Buka di Google Sheets** (URL only ever from stored Google-provided `webViewLink` or `https://docs.google.com/spreadsheets/d/<encoded-own-id>/edit`), **Coba lagi** → dashboard refresh, plus ownership copy: ledger lives in the user's Drive; clearing local cache ≠ deleting the Artami account ≠ deleting the user-owned Sheet.
4. **Recovery copy.** Schema conflict (nothing auto-changed; which columns to review), expired Google authorization (dashboard route classifies Google 401 responses into `GOOGLE_AUTH_REQUIRED`; card copy "Sesi Google berakhir — masuk ulang"), missing tab, and legacy reconnect requirement (rewrite `LegacySheetConnector` copy: why the picker appears, how to identify the file, what cannot change after selection — copy-only).

**Exclusions:** no export/download implementation; no structure auto-repair; no changes to quota, entitlement, or reconnect API contract; no per-user Sheet structure diffing; no new tabs.

**Protected invariants:** reconnect keeps its `.is("spreadsheet_id", null)` tenant guard; account deletion never touches the Sheet; Wave 1 gate semantics only gain the pending block, never lose one; healthy-empty Sheets, provisional balances, and pending legacy review never block writes; Sheet URL is never user-editable.

## Batches

| Batch | Scope | Focused checks |
|---|---|---|
| **A** — metadata + endpoint | `supabase/011-spreadsheet-metadata.sql`, `sheetManager.js`, `apiAuth.js`, `connect-legacy-sheet/route.js`, `api/sheets/connection/route.js` | Tenant isolation, lazy backfill, disconnected nulls, migration applies cleanly, sheetManager tests updated |
| **B** — pending login gate | `financialWriteState.js`, `page.js` session effect | Blocked until first sync on re-login; cleared on success; stale replaces on failure; empty-sheet path unaffected; existing gate tests stay green |
| **C** — hub UI + copy | `SheetsHubCard.jsx` (new), `ProfileTab.jsx`, `api/dashboard/route.js` (401 classification), `LegacySheetConnector.jsx` copy | Card renders all states + healthy, URL target safety, recovery copy assertions, 401 → `GOOGLE_AUTH_REQUIRED` |

**External dependency:** migration `011` must be applied to the live Supabase project before the card shows names for newly provisioned users; the code degrades gracefully (unknown name) until then.

**Verification gate:** one independent diff review, then full Vitest suite, production build, `git diff --check`, `progress.md` entry.
