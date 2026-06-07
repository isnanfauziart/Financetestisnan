import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Budgets"
const RANGE = `${SHEET_NAME}!A:F`

function normalizeKey(kategori, bulan, tahun, akun) {
  return `${kategori}|${bulan}|${tahun}|${akun}`
}

function rowToBudget(row, rowIndex) {
  return {
    rowIndex,
    kategori: String(row[0] || "").trim(),
    bulan: String(row[1] || "").trim(),
    tahun: String(row[2] || "").trim(),
    limit: parseRupiah(row[3] || 0),
    akun: String(row[4] || "").trim(),
    catatan: String(row[5] || "").trim(),
  }
}

function validateBudget(body) {
  const errors = []
  if (!body.kategori) errors.push("kategori required")
  if (!body.bulan) errors.push("bulan required")
  if (!body.tahun) errors.push("tahun required")
  if (!body.limit || isNaN(parseFloat(body.limit))) errors.push("limit must be a number")
  if (body.akun !== undefined && body.akun !== null && typeof body.akun !== "string") errors.push("akun must be a string")
  return errors
}

async function fetchAllBudgets(accessToken) {
  const rows = await getSheetData(accessToken, RANGE).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1] || !r[2]) continue
    out.push(rowToBudget(r, i + 1))
  }
  return out
}

function findRowIndex(budgets, key) {
  const match = budgets.find(b => normalizeKey(b.kategori, b.bulan, b.tahun, b.akun) === key)
  return match ? match.rowIndex : null
}

async function sheetsBatchUpdate(accessToken, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
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

async function sheetsAppend(accessToken, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
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
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    const all = await fetchAllBudgets(session.accessToken)
    const filtered = all.filter(b => {
      if (month && month !== "Semua Bulan" && b.bulan !== month) return false
      if (year && year !== "Semua Tahun" && b.tahun !== String(year)) return false
      return true
    })
    return Response.json({ budgets: filtered })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const errors = validateBudget(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }

    const all = await fetchAllBudgets(session.accessToken)
    const key = normalizeKey(body.kategori, body.bulan, body.tahun, body.akun || "")
    const existingIdx = findRowIndex(all, key)
    if (existingIdx) {
      return Response.json({ error: "Budget already exists for this category+month+account. Use PUT to update." }, { status: 409 })
    }

    const row = [
      body.kategori,
      body.bulan,
      String(body.tahun),
      parseFloat(body.limit),
      body.akun || "",
      body.catatan || "",
    ]
    await sheetsAppend(session.accessToken, RANGE, [row])
    return Response.json({ success: true, message: "Budget created" })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const errors = validateBudget(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }
    if (!body.originalKategori || !body.originalBulan || !body.originalTahun) {
      return Response.json({ error: "originalKategori, originalBulan, originalTahun required to find existing budget" }, { status: 400 })
    }

    const all = await fetchAllBudgets(session.accessToken)
    const originalKey = normalizeKey(body.originalKategori, body.originalBulan, body.originalTahun, body.originalAkun || "")
    const existingIdx = findRowIndex(all, originalKey)
    if (!existingIdx) {
      return Response.json({ error: "Original budget not found" }, { status: 404 })
    }

    const row = [
      body.kategori,
      body.bulan,
      String(body.tahun),
      parseFloat(body.limit),
      body.akun || "",
      body.catatan || "",
    ]
    await sheetsBatchUpdate(session.accessToken, `${SHEET_NAME}!A${existingIdx}:F${existingIdx}`, [row])
    return Response.json({ success: true, message: "Budget updated" })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (!body.kategori || !body.bulan || !body.tahun) {
      return Response.json({ error: "kategori, bulan, tahun required" }, { status: 400 })
    }

    const all = await fetchAllBudgets(session.accessToken)
    const key = normalizeKey(body.kategori, body.bulan, String(body.tahun), body.akun || "")
    const existingIdx = findRowIndex(all, key)
    if (!existingIdx) {
      return Response.json({ error: "Budget not found" }, { status: 404 })
    }

    await sheetsBatchUpdate(session.accessToken, `${SHEET_NAME}!A${existingIdx}:F${existingIdx}`, [[""]])
    return Response.json({ success: true, message: "Budget deleted" })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
