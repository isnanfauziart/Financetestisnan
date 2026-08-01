import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { appendSheetValues, getSheetData, updateSheetValues } from "@/lib/sheets"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { quotaErrorResponse, releaseTransaction, reserveTransaction } from "@/lib/transactionQuota"
import { verifyUndoToken } from "@/lib/transactionUndo"
import { claimFeatureWrite, releaseFeatureWrite } from "@/lib/writeClaims"

const ALLOWED_TYPES = ["income", "expense", "savings"]
const ALLOWED_TABS = ["Pemasukan", "Pengeluaran", "Tabungan"]

function formatDate(dateStr) {
  const [year, month, day] = String(dateStr).split("-")
  return year && month && day ? `${Number(day)} ${AVAILABLE_MONTHS[Number(month) - 1]} ${year}` : dateStr
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const [year, month, day] = String(value).split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "transactions", request)
  if (blocked) return blocked

  let reservation = null
  try {
    const body = await request.json()

    if (body.undoToken) {
      let undo
      try {
        undo = verifyUndoToken(body.undoToken, {
          userId: auth.user.id,
          spreadsheetId: auth.spreadsheetId,
        })
      } catch {
        return Response.json({ error: "Undo tidak valid atau sudah kedaluwarsa" }, { status: 400 })
      }
      if (!ALLOWED_TABS.includes(undo.tab) || !Number.isInteger(undo.rowIndex) || undo.rowIndex < 2 || !Array.isArray(undo.row)) {
        return Response.json({ error: "Undo tidak valid" }, { status: 400 })
      }
      const writeKey = `undo:${undo.jti}`
      if (!undo.jti || !await claimFeatureWrite(auth.user.id, writeKey)) {
        return Response.json({ error: "Undo sudah digunakan" }, { status: 409 })
      }
      const range = `${undo.tab}!A${undo.rowIndex}:O${undo.rowIndex}`
      let current
      try {
        current = await getSheetData(auth.accessToken, range, auth.spreadsheetId)
      } catch (error) {
        await releaseFeatureWrite(auth.user.id, writeKey)
        throw error
      }
      if (current.some(row => row.some(cell => String(cell ?? "").trim()))) {
        return Response.json({ error: "Undo sudah digunakan atau baris telah terisi" }, { status: 409 })
      }
      try {
        await updateSheetValues(auth.accessToken, range, [undo.row], auth.spreadsheetId, "RAW")
      } catch (error) {
        await releaseFeatureWrite(auth.user.id, writeKey)
        throw error
      }
      return Response.json({ success: true, restored: true })
    }

    const { type = "expense", tanggal, keterangan, kategori, jumlah, akunBank, catatan, eventId, eventSubKategori } = body
    if (!tanggal || !kategori || !jumlah) {
      return Response.json({ error: "Tanggal, kategori, dan jumlah wajib diisi" }, { status: 400 })
    }
    if (!isValidIsoDate(tanggal)) return Response.json({ error: "Tanggal tidak valid" }, { status: 400 })
    if (!ALLOWED_TYPES.includes(type)) return Response.json({ error: "Tipe transaksi tidak valid" }, { status: 400 })
    const amount = Number(String(jumlah).replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
      return Response.json({ error: "Jumlah harus antara 1 dan 999.999.999.999" }, { status: 400 })
    }
    if (String(keterangan || "").length > 500 || String(kategori).length > 100 ||
        String(catatan || "").length > 1000 || String(akunBank || "").length > 100) {
      return Response.json({ error: "Data transaksi terlalu panjang" }, { status: 400 })
    }

    const [year, monthNumber] = String(tanggal).split("-")
    const sheetName = type === "income" ? "Pemasukan" : type === "savings" ? "Tabungan" : "Pengeluaran"
    const row = [
      formatDate(tanggal), "", keterangan || "", kategori, amount, "", "", akunBank || "",
      amount, catatan || "", AVAILABLE_MONTHS[Number(monthNumber) - 1] || "", Number(year), Number(year),
      eventId || "", eventSubKategori || "",
    ]
    reservation = await reserveTransaction(auth)
    let result
    try {
      result = await appendSheetValues(auth.accessToken, `${sheetName}!A:O`, [row], auth.spreadsheetId, "RAW")
    } catch (error) {
      await releaseTransaction(reservation)
      reservation = null
      throw error
    }
    const updatedRange = result?.updates?.updatedRange || ""
    const rowIndex = Number(updatedRange.match(/![A-Z]+(\d+):/)?.[1]) || null
    return Response.json({ success: true, message: `Transaksi berhasil disimpan ke tab ${sheetName}`, rowIndex })
  } catch (error) {
    if (error?.code) return quotaErrorResponse(error)
    console.error("[Transaction]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
