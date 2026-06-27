import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const TX_TABS = [
  { name: "Pemasukan", range: "A:O" },
  { name: "Pengeluaran", range: "A:O" },
  { name: "Tabungan", range: "A:O" },
]

function isRowEmpty(row) {
  if (!row) return true
  return row.every(cell => !cell || String(cell).trim() === "")
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

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId } = auth
  const results = []

  for (const tab of TX_TABS) {
    try {
      const rows = await getSheetData(accessToken, `${tab.name}!${tab.range}`, spreadsheetId).catch(() => [])

      if (rows.length === 0) {
        results.push({ tab: tab.name, status: "skipped", message: "Tab kosong" })
        continue
      }

      // Current structure: Row 1 = headers, Row 2+ = data
      // Target structure: Rows 1-4 = APK data (empty), Row 5 = formula (empty), Row 6 = headers, Row 7+ = data

      const headerRow = rows[0] // Headers are currently at row 1
      const dataRows = rows.slice(1).filter(r => !isRowEmpty(r)) // Data starts at row 2

      // Create the reverted structure
      // Rows 1-5: empty (APK data area + formula row)
      const emptyRows = [
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      ]

      // Combine: empty rows + headers + data
      const combined = [...emptyRows, headerRow, ...dataRows]

      // Write the combined data
      const colCount = 15 // A:O = 15 columns
      const lastCol = "O"
      await writeSheetData(accessToken, spreadsheetId, `${tab.name}!A1:${lastCol}${combined.length}`, combined)

      // Clear remaining rows if the sheet was longer
      if (combined.length < rows.length) {
        await clearRows(accessToken, spreadsheetId, `${tab.name}!A${combined.length + 1}:${lastCol}${rows.length}`)
      }

      results.push({
        tab: tab.name,
        status: "reverted",
        headerMovedToRow: 6,
        dataRows: dataRows.length,
        totalRows: combined.length,
      })
    } catch (err) {
      console.error(`[RevertSheet] Error on ${tab.name}:`, err.message)
      results.push({ tab: tab.name, status: "error", message: err.message })
    }
  }

  const revertedCount = results.filter(r => r.status === "reverted").length
  const errorCount = results.filter(r => r.status === "error").length

  return Response.json({
    success: errorCount === 0,
    revertedCount,
    errorCount,
    results,
    message: errorCount === 0
      ? `Berhasil mengembalikan ${revertedCount} tab ke struktur asli. APK seharusnya bisa membaca data lagi.`
      : `${revertedCount} tab berhasil, ${errorCount} tab gagal.`,
  })
}
