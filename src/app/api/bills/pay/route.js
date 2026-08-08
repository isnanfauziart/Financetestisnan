import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { batchUpdateSheetValues, ensureExpenseClassHeader, getSheetData } from "@/lib/sheets"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { rowToBill } from "@/lib/bills"
import { quotaErrorResponse, releaseTransaction, reserveTransaction } from "@/lib/transactionQuota"
import { claimFeatureWrite, releaseFeatureWrite } from "@/lib/writeClaims"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Tagihan"
const RANGE = `${SHEET_NAME}!A:M`

async function fetchAllBills(accessToken, spreadsheetId) {
  const rows = await getSheetData(accessToken, RANGE, spreadsheetId)
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToBill(r, i + 1))
  }
  return out
}

async function transactionExistsById(accessToken, sheetName, txId, spreadsheetId) {
  const rows = await getSheetData(accessToken, `${sheetName}!B:B`, spreadsheetId)
  return rows.some((row, index) => index > 0 && String(row?.[0] || "").trim() === txId)
}

async function findNextEmptyRow(accessToken, sheetName, spreadsheetId) {
  const colA = await getSheetData(accessToken, `${sheetName}!A:A`, spreadsheetId)
  let lastNonEmpty = 0
  for (let i = 0; i < colA.length; i++) {
    const cell = colA[i] && colA[i][0]
    if (cell && String(cell).trim().length > 0) {
      lastNonEmpty = i
    }
  }
  return lastNonEmpty + 2
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "bills", request)
  if (blocked) return blocked
  const { accessToken, spreadsheetId } = auth
  let reservation = null
  let writeKey = null

  try {
    const body = await request.json()
    if (!body.billId) {
      return Response.json({ error: "billId required" }, { status: 400 })
    }

    // 1. Fetch the bill
    const all = await fetchAllBills(accessToken, spreadsheetId)
    const bill = all.find(b => b.id === String(body.billId))
    if (!bill) {
      return Response.json({ error: "Tagihan tidak ditemukan" }, { status: 404 })
    }

    // 2. Auto-create transaction
    const now = new Date()
    const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(now).map(part => [part.type, part.value]))
    const tanggal = `${dateParts.year}-${dateParts.month}-${dateParts.day}`
    const formattedDate = `${Number(dateParts.day)} ${AVAILABLE_MONTHS[Number(dateParts.month) - 1]} ${dateParts.year}`
    const month = AVAILABLE_MONTHS[Number(dateParts.month) - 1]
    const year = dateParts.year
    const kategori = bill.kategoriTransaksi
    const keterangan = `Bayar tagihan: ${bill.nama}`
    const amount = bill.jumlah
    const akunBank = bill.akunBank
    const catatan = bill.catatan || ""

    const targetSheet = bill.tipe === "income" ? "Pemasukan" : "Pengeluaran"
    const txId = `billpay:${bill.id}:${tanggal}`
    if (!["income", "expense"].includes(bill.tipe) || !Number.isFinite(amount) || amount <= 0 || !String(kategori || "").trim()) {
      return Response.json({ error: "Data tagihan tidak valid" }, { status: 400 })
    }

    const billRow = [
      bill.id, bill.nama, bill.jumlah, bill.tipe, bill.kategoriBill, bill.kategoriTransaksi,
      bill.frekuensi, bill.tanggalJatuhTempo, bill.akunBank, bill.aktif ? "TRUE" : "FALSE",
      tanggal, bill.catatan, bill.createdAt,
    ]
    if (await transactionExistsById(accessToken, targetSheet, txId, spreadsheetId)) {
      if (bill.terakhirDibayar !== tanggal) {
        await batchUpdateSheetValues(accessToken, spreadsheetId, [{
          range: `${SHEET_NAME}!A${bill.rowIndex}:M${bill.rowIndex}`, values: [billRow],
        }])
      }
      return Response.json({
        success: true,
        idempotent: true,
        message: "Pembayaran tagihan ini sudah tercatat hari ini",
      })
    }

    const targetRow = await findNextEmptyRow(accessToken, targetSheet, spreadsheetId)

    const txRow = [
      formattedDate,
      txId,
      keterangan,
      kategori,
      amount,
      "",
      "",
      akunBank,
      amount,
      catatan,
      month,
      year,
      year,
      "",
      "",
    ]
    if (targetSheet === "Pengeluaran") {
      await ensureExpenseClassHeader(accessToken, spreadsheetId)
      txRow.push("Rutin")
    }

    writeKey = `bill:${txId}`
    if (!await claimFeatureWrite(auth.user.id, writeKey)) {
      return Response.json({ success: true, idempotent: true, message: "Pembayaran sedang atau sudah diproses" })
    }
    try {
      reservation = await reserveTransaction(auth)
    } catch (error) {
      await releaseFeatureWrite(auth.user.id, writeKey)
      writeKey = null
      throw error
    }
    try {
      await batchUpdateSheetValues(accessToken, spreadsheetId, [
        { range: `${targetSheet}!A${targetRow}:${targetSheet === "Pengeluaran" ? "P" : "O"}${targetRow}`, values: [txRow] },
        { range: `${SHEET_NAME}!A${bill.rowIndex}:M${bill.rowIndex}`, values: [billRow] },
      ])
    } catch (error) {
      await releaseTransaction(reservation)
      await releaseFeatureWrite(auth.user.id, writeKey)
      reservation = null
      writeKey = null
      throw error
    }

    return Response.json({
      success: true,
      message: "Tagihan dibayar dan transaksi dibuat",
      transaction: {
        sheet: targetSheet,
        row: targetRow,
        kategori,
        jumlah: amount,
        keterangan,
      },
    })
  } catch (err) {
    if (err?.code) return quotaErrorResponse(err)
    console.error("[Bills PAY]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
