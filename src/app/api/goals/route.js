import { getToken } from "next-auth/jwt"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Goals"
const RANGE = `${SHEET_NAME}!A:I`

function rowToGoal(row, rowIndex) {
  return {
    rowIndex,
    id: String(row[0] || "").trim(),
    nama: String(row[1] || "").trim(),
    target: parseRupiah(row[2] || 0),
    deadline: String(row[3] || "").trim(),
    kategori: String(row[4] || "").trim(),
    icon: String(row[5] || "").trim(),
    color: String(row[6] || "").trim(),
    createdAt: String(row[7] || "").trim(),
    status: String(row[8] || "open").trim().toLowerCase(),
  }
}

function validateGoal(body) {
  const errors = []
  if (!body.nama) errors.push("nama required")
  if (!body.target || isNaN(parseFloat(body.target))) errors.push("target must be a number")
  if (!body.deadline) errors.push("deadline required")
  if (!body.kategori) errors.push("kategori required")
  return errors
}

async function fetchAllGoals(accessToken) {
  const rows = await getSheetData(accessToken, RANGE).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToGoal(r, i + 1))
  }
  return out
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

async function sheetsUpdate(accessToken, range, values) {
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

export async function GET(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const goals = await fetchAllGoals(accessToken)
    return Response.json({ goals })
  } catch (err) {
    console.error("[Goals]", err)
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
    const errors = validateGoal(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }

    const id = String(Date.now())
    const createdAt = new Date().toISOString().split("T")[0]
    const row = [
      id,
      body.nama,
      parseFloat(body.target),
      body.deadline,
      body.kategori,
      body.icon || "",
      body.color || "",
      createdAt,
      "open",
    ]
    await sheetsAppend(accessToken, RANGE, [row])
    return Response.json({ success: true, id, message: "Goal created" })
  } catch (err) {
    console.error("[Goals]", err)
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
      return Response.json({ error: "id required to update goal" }, { status: 400 })
    }

    const all = await fetchAllGoals(accessToken)
    const existing = all.find(g => g.id === String(body.id))
    if (!existing) {
      return Response.json({ error: "Goal not found" }, { status: 404 })
    }

    // For status-only updates (settle), skip full validation
    if (body.status && !body.nama) {
      const row = [
        existing.id,
        existing.nama,
        existing.target,
        existing.deadline,
        existing.kategori,
        existing.icon,
        existing.color,
        existing.createdAt,
        body.status,
      ]
      await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:I${existing.rowIndex}`, [row])
      return Response.json({ success: true, message: `Goal ${body.status}` })
    }

    // Full update
    const errors = validateGoal(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }

    const row = [
      existing.id,
      body.nama,
      parseFloat(body.target),
      body.deadline,
      body.kategori,
      body.icon || "",
      body.color || "",
      existing.createdAt,
      body.status || existing.status || "open",
    ]
    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:I${existing.rowIndex}`, [row])
    return Response.json({ success: true, message: "Goal updated" })
  } catch (err) {
    console.error("[Goals]", err)
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

    const all = await fetchAllGoals(accessToken)
    const existing = all.find(g => g.id === String(body.id))
    if (!existing) {
      return Response.json({ error: "Goal not found" }, { status: 404 })
    }

    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:I${existing.rowIndex}`, [[""]])
    return Response.json({ success: true, message: "Goal deleted" })
  } catch (err) {
    console.error("[Goals]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
