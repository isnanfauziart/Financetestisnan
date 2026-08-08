import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { expenseClassToSheet } from "@/lib/expenseClass"
import { createUndoToken } from "@/lib/transactionUndo"
import { getSheetData, updateSheetValues } from "@/lib/sheets"

const ALLOWED_TABS = ["Pemasukan", "Pengeluaran", "Tabungan"]
const FALLBACK_ID_PREFIXES = { Pemasukan: "in", Pengeluaran: "ex", Tabungan: "sv" }
const ALLOWED_EXPENSE_CLASSES = ["Rutin", "Spesial"]

function getExpectedId(tab, rowIndex, persistedId) {
  return persistedId || `${FALLBACK_ID_PREFIXES[tab]}-${rowIndex - 1}`
}

function formatDate(dateStr) {
  const parts = String(dateStr).split("-")
  if (parts.length !== 3) return dateStr
  const monthIdx = parseInt(parts[1], 10) - 1
  if (isNaN(monthIdx)) return dateStr
  return `${parseInt(parts[2], 10)} ${AVAILABLE_MONTHS[monthIdx]} ${parts[0]}`
}

function getMonthName(dateStr) {
  const parts = String(dateStr).split("-")
  if (parts.length < 2) return ""
  return AVAILABLE_MONTHS[parseInt(parts[1], 10) - 1] || ""
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const [year, month, day] = String(value).split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export async function PUT(request, { params }) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "transactions", request)
  if (blocked) return blocked
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    const { tab, type, tanggal, keterangan, kategori, jumlah, akunBank, rowIndex, eventId, eventSubKategori, sifat } = body

    if (!ALLOWED_TABS.includes(tab) || !Number.isInteger(rowIndex) || rowIndex < 2 || !tanggal || !kategori || !jumlah) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }
    if (!isValidIsoDate(tanggal)) {
      return Response.json({ error: "Tanggal tidak valid" }, { status: 400 })
    }
    const isExpense = tab === "Pengeluaran"
    const requestedExpenseClass = String(sifat ?? "").trim()
    if (isExpense && Object.prototype.hasOwnProperty.call(body, "sifat")
      && requestedExpenseClass && !ALLOWED_EXPENSE_CLASSES.includes(requestedExpenseClass)) {
      return Response.json({ error: "Sifat pengeluaran tidak valid" }, { status: 400 })
    }

    const formattedDate = formatDate(tanggal)
    const rawAmount = String(jumlah).trim()
    const amount = Number(rawAmount.replace(/[^0-9.]/g, ""))
    if (rawAmount.includes("-") || !Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
      return Response.json({ error: "Jumlah harus antara 1 dan 999.999.999.999" }, { status: 400 })
    }

    const rowWidth = isExpense ? 16 : 15
    const rangeEnd = isExpense ? "P" : "O"
    const range = `${tab}!A${rowIndex}:${rangeEnd}${rowIndex}`
    const existingRows = await getSheetData(accessToken, range, spreadsheetId)
    const existingRow = Array.from({ length: rowWidth }, (_, index) => existingRows[0]?.[index] ?? "")
    if (!existingRow.some(cell => String(cell).trim())) {
      return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }
    const requestedId = String(params?.id || "").trim()
    const existingId = String(existingRow[1]).trim()
    if (requestedId !== getExpectedId(tab, rowIndex, existingId)) {
      return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }
    const row = existingRow.slice()
    row[0] = formattedDate
    row[1] = existingRow[1]
    row[2] = keterangan || ""
    row[3] = kategori
    row[4] = amount
    row[7] = akunBank || ""
    row[8] = amount
    if (Object.prototype.hasOwnProperty.call(body, "eventId")) row[13] = eventId || ""
    if (Object.prototype.hasOwnProperty.call(body, "eventSubKategori")) row[14] = eventSubKategori || ""
    if (isExpense) {
      row[15] = Object.prototype.hasOwnProperty.call(body, "sifat")
        ? expenseClassToSheet(requestedExpenseClass)
        : expenseClassToSheet(existingRow[15])
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Sheets API error: ${err}`)
    }

    return Response.json({ success: true, message: "Transaksi diperbarui" })
  } catch (err) {
    console.error("[TransactionId]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "transactions", request)
  if (blocked) return blocked
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    const { tab, rowIndex } = body

    if (!ALLOWED_TABS.includes(tab) || !Number.isInteger(rowIndex) || rowIndex < 2) {
      return Response.json({ error: "Missing tab or rowIndex" }, { status: 400 })
    }

    const isExpense = tab === "Pengeluaran"
    const rowWidth = isExpense ? 16 : 15
    const rangeEnd = isExpense ? "P" : "O"
    const range = `${tab}!A${rowIndex}:${rangeEnd}${rowIndex}`
    const rows = await getSheetData(accessToken, range, spreadsheetId)
    const row = Array.from({ length: rowWidth }, (_, index) => rows[0]?.[index] ?? "")
    if (!row.some(cell => String(cell).trim())) {
      return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }
    const requestedId = String(params?.id || "").trim()
    const existingId = String(row[1]).trim()
    if (requestedId !== getExpectedId(tab, rowIndex, existingId)) {
      return Response.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }
    const undoToken = createUndoToken({
      userId: auth.user.id, spreadsheetId, tab, rowIndex, row,
    })
    await updateSheetValues(accessToken, range, [Array(rowWidth).fill("")], spreadsheetId, "RAW")
    return Response.json({ success: true, message: "Transaksi dihapus", undoToken })
  } catch (err) {
    console.error("[TransactionId]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
