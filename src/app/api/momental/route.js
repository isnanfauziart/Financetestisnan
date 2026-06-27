import { getToken } from "next-auth/jwt"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { getDefaultSubCategories } from "@/lib/eventTemplates"

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

function computeEventStatus(event) {
  if (event.status === "archived") return "archived"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(event.tanggalMulai)
  const end = new Date(event.tanggalSelesai)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  if (today < start) return "planning"
  if (today > end) return "completed"
  return "active"
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

async function sheetsAppend(accessToken, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }
  return res.json()
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

async function computeProgress(accessToken, events) {
  if (events.length === 0) return {}

  // Read transaction sheets to find tagged transactions
  const [incomeRows, expenseRows, savingsRows] = await Promise.all([
    getSheetData(accessToken, "Pemasukan!A:O").catch(() => []),
    getSheetData(accessToken, "Pengeluaran!A:O").catch(() => []),
    getSheetData(accessToken, "Tabungan!A:O").catch(() => []),
  ])

  const eventMap = {}
  for (const evt of events) {
    eventMap[evt.id] = { total: 0, bySubKategori: {} }
  }

  const processRows = (rows) => {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r[0]) continue
      const eventId = String(r[13] || "").trim() // Column N (index 13)
      if (!eventId || !eventMap[eventId]) continue
      const amount = parseRupiah(r[4] || r[8] || 0) // Column E or I
      const subKat = String(r[14] || "").trim() // Column O (index 14)
      if (amount > 0) {
        eventMap[eventId].total += amount
        if (subKat) {
          eventMap[eventId].bySubKategori[subKat] = (eventMap[eventId].bySubKategori[subKat] || 0) + amount
        }
      }
    }
  }

  processRows(incomeRows)
  processRows(expenseRows)
  processRows(savingsRows)

  return eventMap
}

function validateEvent(body) {
  const errors = []
  if (!body.nama) errors.push("nama required")
  if (!body.tanggalMulai) errors.push("tanggalMulai required")
  if (!body.tanggalSelesai) errors.push("tanggalSelesai required")
  if (!body.totalBudget || isNaN(parseFloat(body.totalBudget))) errors.push("totalBudget must be a number")
  return errors
}

export async function GET(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const { searchParams } = new URL(request.url)
    const withProgress = searchParams.get("progress") === "true"
    const statusFilter = searchParams.get("status")

    const events = await fetchAllEvents(accessToken)
    const subCategories = await fetchAllSubCategories(accessToken)

    // Attach sub-categories to events
    for (const evt of events) {
      evt.subCategories = subCategories
        .filter(s => s.eventId === evt.id)
        .sort((a, b) => (a.urutan || 0) - (b.urutan || 0))
      evt.effectiveStatus = computeEventStatus(evt)
    }

    // Filter by status if requested
    let filtered = events
    if (statusFilter) {
      filtered = events.filter(e => e.effectiveStatus === statusFilter)
    }

    // Compute progress if requested
    if (withProgress) {
      const progressMap = await computeProgress(accessToken, events)
      for (const evt of filtered) {
        const prog = progressMap[evt.id] || { total: 0, bySubKategori: {} }
        evt.spent = prog.total
        evt.pct = evt.totalBudget > 0 ? Math.round((prog.total / evt.totalBudget) * 100) : 0
        evt.remaining = Math.max(0, evt.totalBudget - prog.total)
        for (const sub of evt.subCategories) {
          sub.spent = prog.bySubKategori[sub.subKategori] || 0
          sub.pct = sub.limit > 0 ? Math.round((sub.spent / sub.limit) * 100) : 0
        }
      }
    }

    return Response.json({ events: filtered })
  } catch (err) {
    console.error("[Momental GET]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function POST(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const body = await request.json()
    const errors = validateEvent(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }

    const id = String(Date.now())
    const createdAt = new Date().toISOString().split("T")[0]

    // Write event row
    const eventRow = [
      id,
      body.nama,
      body.tipe || "custom",
      body.tanggalMulai,
      body.tanggalSelesai,
      parseFloat(body.totalBudget),
      body.mode || "independent",
      body.status || "planning",
      body.danaTHR ? parseFloat(body.danaTHR) : "",
      body.catatan || "",
      createdAt,
    ]
    await sheetsAppend(accessToken, RANGE, [eventRow])

    // Write sub-category rows
    let subCats = body.subCategories || []
    if (subCats.length === 0 && body.tipe && body.tipe !== "custom") {
      subCats = getDefaultSubCategories(body.tipe)
    }

    if (subCats.length > 0) {
      const subRows = subCats.map((s, i) => [
        id,
        s.kategori || s.subKategori,
        parseFloat(s.limit) || 0,
        s.icon || "",
        s.color || "",
        s.catatan || "",
      ])
      // Write all sub-category rows at once
      for (const row of subRows) {
        await sheetsAppend(accessToken, SUB_RANGE, [row])
      }
    }

    return Response.json({ success: true, id, message: "Event budget dibuat" })
  } catch (err) {
    console.error("[Momental POST]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function PUT(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const body = await request.json()
    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 })
    }

    const events = await fetchAllEvents(accessToken)
    const existing = events.find(e => e.id === String(body.id))
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

    // If sub-categories provided, clear old ones and write new
    if (body.subCategories) {
      const allSubs = await fetchAllSubCategories(accessToken)
      const oldSubs = allSubs.filter(s => s.eventId === existing.id)
      for (const sub of oldSubs) {
        await sheetsUpdate(accessToken, `${SUB_SHEET}!A${sub.rowIndex}:F${sub.rowIndex}`, [[""]])
      }
      for (const s of body.subCategories) {
        await sheetsAppend(accessToken, SUB_RANGE, [
          existing.id,
          s.kategori || s.subKategori,
          parseFloat(s.limit) || 0,
          s.icon || "",
          s.color || "",
          s.catatan || "",
        ])
      }
    }

    return Response.json({ success: true, message: "Event diperbarui" })
  } catch (err) {
    console.error("[Momental PUT]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function DELETE(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const body = await request.json()
    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 })
    }

    const events = await fetchAllEvents(accessToken)
    const existing = events.find(e => e.id === String(body.id))
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
    console.error("[Momental DELETE]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
