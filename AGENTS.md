# AGENTS.md — Keuangan Isnan Finance Dashboard

## Stack
- Next.js 14.2.5 (App Router), React 18, JavaScript only (no TypeScript)
- Tailwind CSS 3.4, Recharts 2.12, NextAuth v4 (Google OAuth)
- Data lives entirely in Google Sheets — no database

## Commands
- `npm run dev` — start dev server at localhost:3000
- `npm run build` — production build
- `npm run start` — run production build
- No lint, test, or typecheck scripts exist

## Path aliases
- `@/*` → `./src/*` (via `jsconfig.json`)

## Environment (.env.local)
All 5 vars required at runtime:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Cloud OAuth credentials
- `NEXTAUTH_URL` — base URL (local or deployed)
- `NEXTAUTH_SECRET` — random 32+ char string (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `SPREADSHEET_ID` — target Google Sheets spreadsheet ID

## Google Sheets structure
Three tabs must exist with columns A–M:
- `Pemasukan` — income transactions
- `Pengeluaran` — expense transactions
- `Tabungan` — savings transactions

Column layout: Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M(bulan) | Y(tahun) | Y2

If tab names in sheets differ, update `src/app/api/dashboard/route.js`.

## OAuth scope
Google OAuth must request `https://www.googleapis.com/auth/spreadsheets` (see `src/app/api/auth/[...nextauth]/route.js`).

## Data flow
- `src/app/api/auth/[...nextauth]/route.js` — NextAuth config, stores `accessToken` in session
- `src/app/api/dashboard/route.js` — reads all 3 sheets, returns aggregated data
- `src/app/api/transaction/route.js` — appends rows to sheets via Sheets API
- `src/lib/sheets.js` — `getSheetData()`, `parseRupiah()`, `formatRupiah()` helpers

## Notes
- `.kilo/` is a separate plugin package; don't modify unless working on Kilo features
- `.agents/skills/` contains 5 installed agent skills (ai-sdk, frontend-design, grill-me, ui-ux-pro-max, vercel-react-best-practices)
- Two `package-lock.json` files exist (root + `.kilo/`); only the root one is for the app
- Custom Tailwind colors: earth, sage, clay, moss, violet
- The app is in Indonesian (id locale)

## Additional Informations

- Use Skills that related with the task/plan 
- Use subagents if the task/plan are possible
- 