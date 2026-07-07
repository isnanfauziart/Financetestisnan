import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { rowToBill } from "@/lib/bills"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Tagihan"
const RANGE = `${SHEET_NAME}!A:M`

async function fetchAllBills(accessToken, spreadsheetId) {
  const rows = await getSheetData(accessToken, RANGE, spreadsheetId).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToBill(r, i + 1))
  }
  return out
}

async function sheetsUpdate(accessToken, range, values, spreadsheetId) {
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

async function transactionExistsById(accessToken, sheetName, txId, spreadsheetId) {
  const rows = await getSheetData(accessToken, `${sheetName}!B:B`, spreadsheetId).catch(() => [])
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
  const { accessToken, spreadsheetId } = auth

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
    const tanggal = now.toISOString().split("T")[0]
    if (bill.terakhirDibayar === tanggal) {
      return Response.json({
        success: true,
        idempotent: true,
        message: "Tagihan sudah dibayar hari ini",
      })
    }

    const formattedDate = `${now.getDate()} ${AVAILABLE_MONTHS[now.getMonth()]} ${now.getFullYear()}`
    const month = AVAILABLE_MONTHS[now.getMonth()]
    const year = String(now.getFullYear())
    const kategori = bill.kategoriTransaksi
    const keterangan = `Bayar tagihan: ${bill.nama}`
    const amount = bill.jumlah
    const akunBank = bill.akunBank
    const catatan = bill.catatan || ""

    const targetSheet = bill.tipe === "income" ? "Pemasukan" : "Pengeluaran"
    const txId = `billpay:${bill.id}:${tanggal}`

    if (await transactionExistsById(accessToken, targetSheet, txId, spreadsheetId)) {
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
    ]

    await sheetsUpdate(accessToken, `${targetSheet}!A${targetRow}:M${targetRow}`, [txRow], spreadsheetId)

    // 3. Update TerakhirDibayar on the bill
    const todayISO = tanggal
    const updatedRow = [
      bill.id,
      bill.nama,
      bill.jumlah,
      bill.tipe,
      bill.kategoriBill,
      bill.kategoriTransaksi,
      bill.frekuensi,
      bill.tanggalJatuhTempo,
      bill.akunBank,
      bill.aktif ? "TRUE" : "FALSE",
      todayISO,
      bill.catatan,
      bill.createdAt,
    ]
    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${bill.rowIndex}:M${bill.rowIndex}`, [updatedRow], spreadsheetId)

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
    console.error("[Bills PAY]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
