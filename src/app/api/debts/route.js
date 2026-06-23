import { getToken } from "next-auth/jwt"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Utang"
const RANGE = `${SHEET_NAME}!A:I`

function rowToDebt(row, rowIndex) {
  return {
    rowIndex,
    id: String(row[0] || "").trim(),
    namaOrang: String(row[1] || "").trim(),
    jumlah: parseRupiah(row[2] || 0),
    arah: String(row[3] || "utang").trim().toLowerCase(),
    jatuhTempo: String(row[4] || "").trim(),
    status: String(row[5] || "open").trim().toLowerCase(),
    sisaSaldo: parseRupiah(row[6] || 0),
    catatan: String(row[7] || "").trim(),
    createdAt: String(row[8] || "").trim(),
  }
}

function validateDebt(body) {
  const errors = []
  if (!body.namaOrang) errors.push("namaOrang required")
  if (!body.jumlah || isNaN(parseFloat(body.jumlah))) errors.push("jumlah must be a number")
  if (!body.arah || !["utang", "piutang"].includes(body.arah)) errors.push("arah must be 'utang' or 'piutang'")
  if (!body.jatuhTempo) errors.push("jatuhTempo required")
  return errors
}

async function fetchAllDebts(accessToken) {
  const rows = await getSheetData(accessToken, RANGE).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToDebt(r, i + 1))
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
    const debts = await fetchAllDebts(accessToken)
    return Response.json({ debts })
  } catch (err) {
    console.error("[Debts]", err)
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

    // Handle payment action
    if (body.action === "pay") {
      return handlePayment(accessToken, body)
    }

    const errors = validateDebt(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }

    const id = String(Date.now())
    const createdAt = new Date().toISOString().split("T")[0]
    const jumlah = parseFloat(body.jumlah)
    const row = [
      id,
      body.namaOrang,
      jumlah,
      body.arah,
      body.jatuhTempo,
      "open",
      jumlah, // SisaSaldo starts at full amount
      body.catatan || "",
      createdAt,
    ]
    await sheetsAppend(accessToken, RANGE, [row])
    return Response.json({ success: true, id, message: "Debt created" })
  } catch (err) {
    console.error("[Debts]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

async function handlePayment(accessToken, body) {
  if (!body.id || !body.amount || body.amount <= 0) {
    return Response.json({ error: "id and positive amount required for payment" }, { status: 400 })
  }

  const all = await fetchAllDebts(accessToken)
  const existing = all.find(d => d.id === String(body.id))
  if (!existing) {
    return Response.json({ error: "Debt not found" }, { status: 404 })
  }
  if (existing.status === "settled") {
    return Response.json({ error: "Debt already settled" }, { status: 400 })
  }

  const paymentAmount = Math.min(parseFloat(body.amount), existing.sisaSaldo)
  const newSisa = existing.sisaSaldo - paymentAmount
  const newStatus = newSisa <= 0 ? "settled" : "open"

  // Update the debt record
  await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:I${existing.rowIndex}`, [
    [
      existing.id,
      existing.namaOrang,
      existing.jumlah,
      existing.arah,
      existing.jatuhTempo,
      newStatus,
      Math.max(0, newSisa),
      existing.catatan,
      existing.createdAt,
    ],
  ])

  // Create a transaction for the payment
  const txType = "expense"
  const txSheet = "Pengeluaran"
  const desc = existing.arah === "utang"
    ? `Bayar ke ${existing.namaOrang}`
    : `Terima dari ${existing.namaOrang}`

  // Find next empty row in transaction sheet
  const txRange = `${txSheet}!A:M`
  const txRows = await getSheetData(accessToken, txRange).catch(() => [])
  const nextRow = txRows.length + 1
  const month = new Date().toLocaleString("id-ID", { month: "short" }).replace(".", "")
  const year = String(new Date().getFullYear())
  const day = String(new Date().getDate()).padStart(2, "0")
  const monthName = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][new Date().getMonth()]
  const dateStr = `${day} ${monthName} ${year}`

  const txRow = [
    dateStr,
    `debt-${Date.now()}`,
    desc,
    "Utang",
    paymentAmount,
    0, // Pajak
    0, // Biaya
    "", // AkunBank
    paymentAmount, // Net
    `Auto: ${existing.arah} ${existing.namaOrang}`,
    monthName,
    year,
    year,
  ]

  const txUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(txRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  await fetch(txUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [txRow] }),
  })

  return Response.json({
    success: true,
    paymentAmount,
    newSisa: Math.max(0, newSisa),
    newStatus,
    message: newStatus === "settled" ? "Debt fully settled!" : `Payment of ${paymentAmount} recorded`,
  })
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

    const all = await fetchAllDebts(accessToken)
    const existing = all.find(d => d.id === String(body.id))
    if (!existing) {
      return Response.json({ error: "Debt not found" }, { status: 404 })
    }

    const row = [
      existing.id,
      body.namaOrang || existing.namaOrang,
      parseFloat(body.jumlah) || existing.jumlah,
      body.arah || existing.arah,
      body.jatuhTempo || existing.jatuhTempo,
      body.status || existing.status,
      body.sisaSaldo !== undefined ? parseFloat(body.sisaSaldo) : existing.sisaSaldo,
      body.catatan !== undefined ? body.catatan : existing.catatan,
      existing.createdAt,
    ]
    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:I${existing.rowIndex}`, [row])
    return Response.json({ success: true, message: "Debt updated" })
  } catch (err) {
    console.error("[Debts]", err)
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

    const all = await fetchAllDebts(accessToken)
    const existing = all.find(d => d.id === String(body.id))
    if (!existing) {
      return Response.json({ error: "Debt not found" }, { status: 404 })
    }

    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:I${existing.rowIndex}`, [[""]])
    return Response.json({ success: true, message: "Debt deleted" })
  } catch (err) {
    console.error("[Debts]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
