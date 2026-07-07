import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"
import { computeBillStatus, rowToBill } from "@/lib/bills"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Tagihan"
const RANGE = `${SHEET_NAME}!A:M`

async function fetchAllBills(accessToken, spreadsheetId) {
  const rows = await getSheetData(accessToken, RANGE, spreadsheetId).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    const bill = rowToBill(r, i + 1)
    const computed = computeBillStatus(bill)
    out.push({ ...bill, ...computed })
  }
  return out
}

function validateBill(body) {
  const errors = []
  if (!body.nama) errors.push("nama required")
  if (!body.jumlah || isNaN(parseFloat(body.jumlah))) errors.push("jumlah must be a number")
  if (!body.tipe || !["expense", "income"].includes(body.tipe)) errors.push("tipe must be 'expense' or 'income'")
  if (!body.kategoriBill) errors.push("kategoriBill required")
  if (!body.kategoriTransaksi) errors.push("kategoriTransaksi required")
  if (!body.frekuensi) errors.push("frekuensi required")
  if (!body.tanggalJatuhTempo || isNaN(parseInt(body.tanggalJatuhTempo))) errors.push("tanggalJatuhTempo must be a number")
  return errors
}

async function sheetsAppend(accessToken, range, values, spreadsheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: "POST",
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

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId } = auth

  try {
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get("type")
    const statusFilter = searchParams.get("status")

    let bills = await fetchAllBills(accessToken, spreadsheetId)

    // Filter by aktif by default
    const showInactive = searchParams.get("all") === "true"
    if (!showInactive) {
      bills = bills.filter(b => b.aktif)
    }

    if (typeFilter) {
      bills = bills.filter(b => b.tipe === typeFilter)
    }
    if (statusFilter) {
      bills = bills.filter(b => b.status === statusFilter)
    }

    // Sort: overdue first, then by daysUntilDue ascending
    bills.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

    return Response.json({ bills })
  } catch (err) {
    console.error("[Bills GET]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    const errors = validateBill(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }

    const id = String(Date.now())
    const createdAt = new Date().toISOString().split("T")[0]
    const row = [
      id,
      body.nama,
      parseFloat(body.jumlah),
      body.tipe,
      body.kategoriBill,
      body.kategoriTransaksi,
      body.frekuensi,
      parseInt(body.tanggalJatuhTempo, 10),
      body.akunBank || "",
      "TRUE",
      "",
      body.catatan || "",
      createdAt,
    ]
    await sheetsAppend(accessToken, RANGE, [row], spreadsheetId)
    return Response.json({ success: true, id, message: "Tagihan dibuat" })
  } catch (err) {
    console.error("[Bills POST]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
