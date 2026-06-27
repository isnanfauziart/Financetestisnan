import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = 'force-dynamic'

const SHARED_SPREADSHEET_ID = process.env.SPREADSHEET_ID

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { user } = auth

  // Update user's spreadsheet_id to the shared sheet
  const { error } = await supabaseAdmin
    .from("users")
    .update({
      spreadsheet_id: SHARED_SPREADSHEET_ID,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    console.error("[Migrate] Gagal update spreadsheet_id:", error)
    return Response.json({ error: "Gagal mengupdate spreadsheet_id" }, { status: 500 })
  }

  return Response.json({
    success: true,
    message: "Berhasil mengarahkan ke sheet bersama",
    spreadsheetId: SHARED_SPREADSHEET_ID,
  })
}

const TABS = [
  { name: "Pemasukan", range: "A:M" },
  { name: "Pengeluaran", range: "A:M" },
  { name: "Tabungan", range: "A:M" },
  { name: "Budgets", range: "A:F" },
  { name: "Goals", range: "A:H" },
  { name: "Utang", range: "A:I" },
  { name: "Momental", range: "A:K" },
  { name: "EventBudgets", range: "A:F" },
  { name: "Tagihan", range: "A:M" },
  { name: "Settings", range: "A:B" },
]

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

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId, user } = auth

  if (!SHARED_SPREADSHEET_ID) {
    return Response.json({ error: "SPREADSHEET_ID tidak ditemukan di environment" }, { status: 500 })
  }

  if (spreadsheetId === SHARED_SPREADSHEET_ID) {
    return Response.json({ error: "Sheet personal sama dengan sheet bersama. Tidak perlu migrasi." }, { status: 400 })
  }

  const results = []
  let successCount = 0
  let failCount = 0

  for (const tab of TABS) {
    const tabName = tab.name
    const range = `${tabName}!${tab.range}`

    try {
      // Read data from shared sheet
      const rows = await getSheetData(accessToken, range, SHARED_SPREADSHEET_ID)

      if (rows.length === 0) {
        results.push({ tab: tabName, status: "skipped", message: "Tab kosong di sheet bersama" })
        successCount++
        continue
      }

      // Write data to personal sheet
      await writeSheetData(accessToken, spreadsheetId, range, rows)

      results.push({ tab: tabName, status: "success", rows: rows.length })
      successCount++
    } catch (err) {
      console.error(`[Migrate] Gagal memproses tab ${tabName}:`, err.message)
      results.push({ tab: tabName, status: "error", message: err.message })
      failCount++
      break
    }
  }

  return Response.json({
    success: failCount === 0,
    successCount,
    failCount,
    results,
    message: failCount === 0
      ? `Berhasil menyalin ${successCount} tab dari sheet bersama ke sheet personal`
      : `Gagal setelah ${successCount} tab berhasil. Gagal pada tab: ${results.find(r => r.status === "error")?.tab}`,
  })
}
