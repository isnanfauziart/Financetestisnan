import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

// Transaction tabs that need fixing (read A:O for 15 columns)
const TX_TABS = [
  { name: "Pemasukan", range: "A:O", headerKeywords: ["tanggal", "tanggaL"] },
  { name: "Pengeluaran", range: "A:O", headerKeywords: ["tanggal", "tanggaL"] },
  { name: "Tabungan", range: "A:O", headerKeywords: ["tanggal", "tanggaL"] },
]

// Other tabs with their own header keywords
const OTHER_TABS = [
  { name: "Budgets", range: "A:F", headerKeywords: ["kategori"] },
  { name: "Goals", range: "A:H", headerKeywords: ["id", "nama"] },
  { name: "Utang", range: "A:I", headerKeywords: ["id", "namaorang"] },
  { name: "Momental", range: "A:K", headerKeywords: ["id", "nama"] },
  { name: "EventBudgets", range: "A:F", headerKeywords: ["eventid"] },
  { name: "Tagihan", range: "A:M", headerKeywords: ["id", "nama"] },
]

function isRowEmpty(row) {
  if (!row) return true
  return row.every(cell => !cell || String(cell).trim() === "")
}

function findHeaderRowIndex(rows, headerKeywords) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0]) continue
    const firstCell = String(row[0]).trim().toLowerCase()
    if (headerKeywords.includes(firstCell)) {
      return i
    }
  }
  return -1
}

async function writeSheetData(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }
  return res.json()
}

async function clearRows(accessToken, spreadsheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }
  return res.json()
}

function getColumnName(colIndex) {
  // Convert 0-based column index to column name (0=A, 1=B, ..., 25=Z, 26=AA)
  let name = ""
  let n = colIndex
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name
    n = Math.floor(n / 26) - 1
  }
  return name
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId } = auth
  const results = []

  // Fix transaction tabs
  for (const tab of TX_TABS) {
    try {
      const rows = await getSheetData(accessToken, `${tab.name}!${tab.range}`, spreadsheetId).catch(() => [])
      
      if (rows.length === 0) {
        results.push({ tab: tab.name, status: "skipped", message: "Tab kosong" })
        continue
      }

      const headerIdx = findHeaderRowIndex(rows, tab.headerKeywords)
      
      if (headerIdx === -1) {
        // No header found, assume structure is correct
        results.push({ tab: tab.name, status: "skipped", message: "Header tidak ditemukan, struktur dianggap benar" })
        continue
      }

      if (headerIdx === 0) {
        // Header is already on row 1, check if APK data exists below
        // Just verify the structure is correct
        results.push({ tab: tab.name, status: "skipped", message: "Header sudah di row 1" })
        continue
      }

      // Header is NOT on row 1, need to fix
      const aboveHeaders = rows.slice(0, headerIdx).filter(r => !isRowEmpty(r))
      const headerRow = rows[headerIdx]
      const belowHeaders = rows.slice(headerIdx + 1).filter(r => !isRowEmpty(r))

      // Combine: header on row 1, real data, then APK data at end
      const combined = [headerRow, ...belowHeaders, ...aboveHeaders]

      // Write combined data starting from row 1
      const colCount = tab.range.split(":")[1].charCodeAt(0) - 64 // e.g., O = 15
      const lastCol = getColumnName(colCount - 1)
      await writeSheetData(accessToken, spreadsheetId, `${tab.name}!A1:${lastCol}${combined.length}`, combined)

      // Clear remaining rows if the sheet was longer
      if (combined.length < rows.length) {
        await clearRows(accessToken, spreadsheetId, `${tab.name}!A${combined.length + 1}:${lastCol}${rows.length}`)
      }

      results.push({
        tab: tab.name,
        status: "fixed",
        headerWasAtRow: headerIdx + 1,
        aboveHeadersCount: aboveHeaders.length,
        belowHeadersCount: belowHeaders.length,
        totalRows: combined.length,
      })
    } catch (err) {
      console.error(`[FixSheet] Error on ${tab.name}:`, err.message)
      results.push({ tab: tab.name, status: "error", message: err.message })
    }
  }

  // Fix other tabs (Budgets, Goals, etc.)
  for (const tab of OTHER_TABS) {
    try {
      const rows = await getSheetData(accessToken, `${tab.name}!${tab.range}`, spreadsheetId).catch(() => [])
      
      if (rows.length === 0) {
        results.push({ tab: tab.name, status: "skipped", message: "Tab kosong" })
        continue
      }

      const headerIdx = findHeaderRowIndex(rows, tab.headerKeywords)
      
      if (headerIdx === -1 || headerIdx === 0) {
        results.push({ tab: tab.name, status: "skipped", message: headerIdx === 0 ? "Header sudah di row 1" : "Header tidak ditemukan" })
        continue
      }

      // Fix the structure
      const aboveHeaders = rows.slice(0, headerIdx).filter(r => !isRowEmpty(r))
      const headerRow = rows[headerIdx]
      const belowHeaders = rows.slice(headerIdx + 1).filter(r => !isRowEmpty(r))
      const combined = [headerRow, ...belowHeaders, ...aboveHeaders]

      const colCount = tab.range.split(":")[1].charCodeAt(0) - 64
      const lastCol = getColumnName(colCount - 1)
      await writeSheetData(accessToken, spreadsheetId, `${tab.name}!A1:${lastCol}${combined.length}`, combined)

      if (combined.length < rows.length) {
        await clearRows(accessToken, spreadsheetId, `${tab.name}!A${combined.length + 1}:${lastCol}${rows.length}`)
      }

      results.push({
        tab: tab.name,
        status: "fixed",
        headerWasAtRow: headerIdx + 1,
        aboveHeadersCount: aboveHeaders.length,
        belowHeadersCount: belowHeaders.length,
        totalRows: combined.length,
      })
    } catch (err) {
      console.error(`[FixSheet] Error on ${tab.name}:`, err.message)
      results.push({ tab: tab.name, status: "error", message: err.message })
    }
  }

  // Fix Settings tab - ensure startingBalance exists
  try {
    const settingsRows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId).catch(() => [])
    
    let hasStartingBalance = false
    for (const row of settingsRows) {
      if (row && row[0]) {
        const key = String(row[0]).trim().toLowerCase()
        if (key === "startingbalance") {
          hasStartingBalance = true
          break
        }
      }
    }

    if (!hasStartingBalance) {
      // Find first empty row in Settings
      let targetRow = settingsRows.length + 1
      await writeSheetData(accessToken, spreadsheetId, `Settings!A${targetRow}:B${targetRow}`, [["startingBalance", "0"]])
      results.push({ tab: "Settings", status: "fixed", message: "Added startingBalance key" })
    } else {
      results.push({ tab: "Settings", status: "skipped", message: "startingBalance sudah ada" })
    }
  } catch (err) {
    console.error(`[FixSheet] Error on Settings:`, err.message)
    results.push({ tab: "Settings", status: "error", message: err.message })
  }

  const fixedCount = results.filter(r => r.status === "fixed").length
  const errorCount = results.filter(r => r.status === "error").length

  return Response.json({
    success: errorCount === 0,
    fixedCount,
    errorCount,
    results,
    message: errorCount === 0
      ? `Berhasil memperbaiki ${fixedCount} tab. Silakan refresh halaman.`
      : `${fixedCount} tab berhasil, ${errorCount} tab gagal.`,
  })
}
