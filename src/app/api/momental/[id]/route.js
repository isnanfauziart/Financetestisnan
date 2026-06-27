import { getToken } from "next-auth/jwt"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Momental"
const RANGE = `${SHEET_NAME}!A:K`
const SUB_SHEET = "EventBudgets"
const SUB_RANGE = `${SUB_SHEET}!A:F`

function rowToEvent(row, rowIndex) {
  return {
    rowIndex,
    id: String(row[0] || "").trim(),
    nama: String(row[1] || "").trim(),
    tipe: String(row[2] || "custom").trim(),
    tanggalMulai: String(row[3] || "").trim(),
    tanggalSelesai: String(row[4] || "").trim(),
    totalBudget: parseRupiah(row[5] || 0),
    mode: String(row[6] || "independent").trim(),
    status: String(row[7] || "planning").trim(),
    danaTHR: parseRupiah(row[8] || 0),
    catatan: String(row[9] || "").trim(),
    createdAt: String(row[10] || "").trim(),
  }
}

function rowToSubCategory(row, rowIndex) {
  return {
    rowIndex,
    eventId: String(row[0] || "").trim(),
    subKategori: String(row[1] || "").trim(),
    limit: parseRupiah(row[2] || 0),
    icon: String(row[3] || "").trim(),
    color: String(row[4] || "").trim(),
    catatan: String(row[5] || "").trim(),
  }
}

async function fetchAllEvents(accessToken) {
  const rows = await getSheetData(accessToken, RANGE).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToEvent(r, i + 1))
  }
  return out
}

async function fetchAllSubCategories(accessToken) {
  const rows = await getSheetData(accessToken, SUB_RANGE).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToSubCategory(r, i + 1))
  }
  return out
}

async function fetchEventTransactions(accessToken, eventId) {
  const [incomeRows, expenseRows, savingsRows] = await Promise.all([
    getSheetData(accessToken, "Pemasukan!A:O").catch(() => []),
    getSheetData(accessToken, "Pengeluaran!A:O").catch(() => []),
    getSheetData(accessToken, "Tabungan!A:O").catch(() => []),
  ])

  const transactions = []
  const processRows = (rows, type) => {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r[0]) continue
      const eid = String(r[13] || "").trim()
      if (eid !== eventId) continue
      transactions.push({
        id: r[1] || `${type[0]}-${i}`,
        rowIndex: i + 1,
        date: r[0],
        desc: r[2] || "",
        category: r[3] || "",
        amount: parseRupiah(r[4] || r[8] || 0),
        type,
        account: String(r[7] || "").trim(),
        eventId: eid,
        eventSubKategori: String(r[14] || "").trim(),
      })
    }
  }

  processRows(incomeRows, "income")
  processRows(expenseRows, "expense")
  processRows(savingsRows, "savings")

  transactions.sort((a, b) => {
    // Sort by date descending (newest first)
    const parseDate = (d) => {
      if (!d) return 0
      const parts = d.split(" ")
      if (parts.length < 3) return 0
      const months = { Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Sep:8, Okt:9, Nov:10, Des:11 }
      return new Date(parseInt(parts[2]), months[parts[1]] || 0, parseInt(parts[0])).getTime()
    }
    return parseDate(b.date) - parseDate(a.date)
  })

  return transactions
}

async function sheetsUpdate(accessToken, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }
  return res.json()
}

export async function GET(request, { params }) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const { id } = params
    const events = await fetchAllEvents(accessToken)
    const event = events.find(e => e.id === id)
    if (!event) {
      return Response.json({ error: "Event tidak ditemukan" }, { status: 404 })
    }

    // Get sub-categories
    const allSubs = await fetchAllSubCategories(accessToken)
    event.subCategories = allSubs.filter(s => s.eventId === event.id)

    // Get transactions
    const transactions = await fetchEventTransactions(accessToken, event.id)

    // Compute progress
    let totalSpent = 0
    const bySubKategori = {}
    for (const t of transactions) {
      totalSpent += t.amount
      if (t.eventSubKategori) {
        bySubKategori[t.eventSubKategori] = (bySubKategori[t.eventSubKategori] || 0) + t.amount
      }
    }

    event.spent = totalSpent
    event.pct = event.totalBudget > 0 ? Math.round((totalSpent / event.totalBudget) * 100) : 0
    event.remaining = Math.max(0, event.totalBudget - totalSpent)

    for (const sub of event.subCategories) {
      sub.spent = bySubKategori[sub.subKategori] || 0
      sub.pct = sub.limit > 0 ? Math.round((sub.spent / sub.limit) * 100) : 0
    }

    // Effective status
    if (event.status !== "archived") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(event.tanggalMulai)
      const end = new Date(event.tanggalSelesai)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)
      if (today < start) event.effectiveStatus = "planning"
      else if (today > end) event.effectiveStatus = "completed"
      else event.effectiveStatus = "active"
    } else {
      event.effectiveStatus = "archived"
    }

    return Response.json({ event, transactions })
  } catch (err) {
    console.error("[MomentalId GET]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const { id } = params
    const body = await request.json()

    const events = await fetchAllEvents(accessToken)
    const existing = events.find(e => e.id === id)
    if (!existing) {
      return Response.json({ error: "Event tidak ditemukan" }, { status: 404 })
    }

    const eventRow = [
      existing.id,
      body.nama !== undefined ? body.nama : existing.nama,
      body.tipe !== undefined ? body.tipe : existing.tipe,
      body.tanggalMulai !== undefined ? body.tanggalMulai : existing.tanggalMulai,
      body.tanggalSelesai !== undefined ? body.tanggalSelesai : existing.tanggalSelesai,
      body.totalBudget !== undefined ? parseFloat(body.totalBudget) : existing.totalBudget,
      body.mode !== undefined ? body.mode : existing.mode,
      body.status !== undefined ? body.status : existing.status,
      body.danaTHR !== undefined ? (body.danaTHR ? parseFloat(body.danaTHR) : "") : existing.danaTHR || "",
      body.catatan !== undefined ? body.catatan : existing.catatan,
      existing.createdAt,
    ]
    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:K${existing.rowIndex}`, [eventRow])

    return Response.json({ success: true, message: "Event diperbarui" })
  } catch (err) {
    console.error("[MomentalId PUT]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const { id } = params
    const events = await fetchAllEvents(accessToken)
    const existing = events.find(e => e.id === id)
    if (!existing) {
      return Response.json({ error: "Event tidak ditemukan" }, { status: 404 })
    }

    // Clear event row
    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:K${existing.rowIndex}`, [[""]])

    // Clear sub-category rows
    const allSubs = await fetchAllSubCategories(accessToken)
    const subs = allSubs.filter(s => s.eventId === existing.id)
    for (const sub of subs) {
      await sheetsUpdate(accessToken, `${SUB_SHEET}!A${sub.rowIndex}:F${sub.rowIndex}`, [[""]])
    }

    return Response.json({ success: true, message: "Event dihapus" })
  } catch (err) {
    console.error("[MomentalId DELETE]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
