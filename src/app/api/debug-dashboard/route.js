import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { pickAmount } from "@/lib/parseSheetRow"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint to debug why dashboard returns 0 transactions.
 * 
 * GET /api/debug-dashboard
 * 
 * Returns detailed analysis of:
 * 1. Which spreadsheetId is being used
 * 2. What data Google Sheets API actually returns
 * 3. Why rows are being skipped
 * 4. How pickAmount parses each row
 */
export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId, user } = auth
  const SHARED_SPREADSHEET_ID = process.env.SPREADSHEET_ID

  const diagnostics = {
    // === STEP 1: Identity ===
    spreadsheetId: {
      fromSupabase: user.spreadsheet_id,
      fromEnv: SHARED_SPREADSHEET_ID,
      beingUsed: spreadsheetId,
      isSharedSheet: spreadsheetId === SHARED_SPREADSHEET_ID,
      isPersonalSheet: spreadsheetId !== SHARED_SPREADSHEET_ID,
    },

    // === STEP 2: Tab existence check ===
    tabChecks: {},

    // === STEP 3: Raw data samples ===
    rawData: {},

    // === STEP 4: Parser analysis ===
    parserAnalysis: {},

    // === STEP 5: pickAmount test on first 5 rows ===
    pickAmountTests: [],
  }

  // Check each transaction tab
  const tabs = [
    { name: "Pemasukan", type: "income" },
    { name: "Pengeluaran", type: "expense" },
    { name: "Tabungan", type: "savings" },
  ]

  for (const tab of tabs) {
    const range = `${tab.name}!A:O`
    
    try {
      const rows = await getSheetData(accessToken, range, spreadsheetId)
      
      diagnostics.tabChecks[tab.name] = {
        status: "success",
        totalRows: rows.length,
        hasHeader: rows.length > 0,
        hasData: rows.length > 1,
        headerRow: rows[0] || null,
      }

      // Store raw data sample (first 10 rows)
      diagnostics.rawData[tab.name] = {
        first10Rows: rows.slice(0, 10).map((row, i) => ({
          rowIndex: i,
          length: row ? row.length : 0,
          columnK_value: row ? row[10] : undefined,
          columnK_type: row ? typeof row[10] : "undefined",
          columnK_isEmpty: row ? !row[10] : true,
          columnE_value: row ? row[4] : undefined,
          columnI_value: row ? row[8] : undefined,
          fullRow: row || [],
        })),
      }

      // Analyze why rows are being skipped
      const analysis = {
        totalDataRows: Math.max(0, rows.length - 1),
        skippedNoRow: 0,
        skippedNoMonth: 0,
        skippedNoAmount: 0,
        parsed: 0,
        sampleSkippedRows: [],
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        
        if (!row) {
          analysis.skippedNoRow++
          if (analysis.sampleSkippedRows.length < 3) {
            analysis.sampleSkippedRows.push({ rowIndex: i, reason: "row is null/undefined" })
          }
          continue
        }
        
        if (!row[10]) {
          analysis.skippedNoMonth++
          if (analysis.sampleSkippedRows.length < 5) {
            analysis.sampleSkippedRows.push({
              rowIndex: i,
              reason: "row[10] is falsy",
              rowLength: row.length,
              row10Value: String(row[10]),
              row10Type: typeof row[10],
              row10StrictEquals: row[10] === undefined,
              row10LooseEquals: row[10] == null,
              firstFewCells: row.slice(0, 13).map((c, j) => `[${j}]=${JSON.stringify(c)}`),
            })
          }
          continue
        }

        const amount = pickAmount(row)
        if (amount <= 0) {
          analysis.skippedNoAmount++
          if (analysis.sampleSkippedRows.length < 5) {
            analysis.sampleSkippedRows.push({
              rowIndex: i,
              reason: "pickAmount returned 0",
              month: String(row[10]).trim(),
              columnE: row[4],
              columnI: row[8],
              pickAmountResult: amount,
              isNumericE: /^-?[\d.,]+$/.test(String(row[4] || "").trim()),
              isNumericI: /^-?[\d.,]+$/.test(String(row[8] || "").trim()),
              parseRupiahE: parseRupiah(row[4]),
              parseRupiahI: parseRupiah(row[8]),
            })
          }
          continue
        }

        analysis.parsed++
      }

      diagnostics.parserAnalysis[tab.name] = analysis

      // Test pickAmount on first 5 data rows
      for (let i = 1; i < Math.min(6, rows.length); i++) {
        const row = rows[i]
        if (!row) continue
        
        diagnostics.pickAmountTests.push({
          tab: tab.name,
          rowIndex: i,
          month: row[10],
          amount: pickAmount(row),
          columnE_raw: row[4],
          columnE_parsed: parseRupiah(row[4]),
          columnI_raw: row[8],
          columnI_parsed: parseRupiah(row[8]),
          columnI_isNumeric: /^-?[\d.,]+$/.test(String(row[8] || "").trim()),
        })
      }

    } catch (err) {
      diagnostics.tabChecks[tab.name] = {
        status: "error",
        error: err.message,
      }
    }
  }

  // === STEP 6: Check Settings tab ===
  try {
    const settingsRows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId)
    diagnostics.settings = {
      status: "success",
      totalRows: settingsRows.length,
      data: settingsRows.map(r => ({ key: r?.[0], value: r?.[1] })),
    }
  } catch (err) {
    diagnostics.settings = { status: "error", error: err.message }
  }

  // === STEP 7: Compare with shared sheet ===
  if (spreadsheetId !== SHARED_SPREADSHEET_ID && SHARED_SPREADSHEET_ID) {
    try {
      const sharedRows = await getSheetData(accessToken, "Pengeluaran!A1:A10", SHARED_SPREADSHEET_ID)
      diagnostics.sharedSheetComparison = {
        status: "success",
        sharedSheetId: SHARED_SPREADSHEET_ID,
        pengeluaranRowCount: sharedRows.length,
        firstFewRows: sharedRows.slice(0, 5),
      }
    } catch (err) {
      diagnostics.sharedSheetComparison = { status: "error", error: err.message }
    }
  }

  // === SUMMARY ===
  const summary = {
    issue: null,
    diagnosis: [],
    recommendations: [],
  }

  // Check if using personal sheet
  if (diagnostics.spreadsheetId.isPersonalSheet) {
    summary.diagnosis.push("⚠️ Dashboard is reading from PERSONAL sheet, not shared sheet")
    
    const pengeluaranCheck = diagnostics.tabChecks["Pengeluaran"]
    if (pengeluaranCheck?.totalRows <= 1) {
      summary.issue = "PERSONAL_SHEET_EMPTY"
      summary.diagnosis.push("🔴 Personal sheet has NO data rows (only header)")
      summary.recommendations.push("Run /api/migrate to copy data from shared sheet to personal sheet")
      summary.recommendations.push("OR update user's spreadsheet_id in Supabase to point to shared sheet")
    }
  }

  // Check if rows are being skipped
  for (const tab of tabs) {
    const analysis = diagnostics.parserAnalysis[tab.name]
    if (analysis && analysis.totalDataRows > 0 && analysis.parsed === 0) {
      summary.diagnosis.push(`🔴 All ${analysis.totalDataRows} rows in ${tab.name} are being skipped`)
      
      if (analysis.skippedNoMonth > 0) {
        summary.diagnosis.push(`  → ${analysis.skippedNoMonth} rows skipped: column K (month) is empty`)
        summary.recommendations.push(`Check if column K in ${tab.name} tab has month names (Jun, Jan, etc.)`)
      }
      if (analysis.skippedNoAmount > 0) {
        summary.diagnosis.push(`  → ${analysis.skippedNoAmount} rows skipped: amount is 0`)
        summary.recommendations.push(`Check if columns E and I in ${tab.name} have numeric amounts`)
      }
    }
  }

  if (!summary.issue) {
    summary.issue = "UNKNOWN - check diagnostics details"
  }

  return Response.json({
    summary,
    diagnostics,
    timestamp: new Date().toISOString(),
  })
}
