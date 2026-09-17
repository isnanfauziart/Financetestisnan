import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { ensureExpenseClassHeader, findNextEmptyRow, getSheetData } from "@/lib/sheets"
import { rowToBill } from "@/lib/bills"
import { quotaErrorResponse } from "@/lib/transactionQuota"
import { OPERATION_KINDS } from "@/lib/financialOperations"
import { buildLedgerRow, ledgerRange, wibToday } from "@/lib/ledgerRows"
import { resolveCheckpoint, readCheckpointSettings } from "@/lib/checkpoint"
import { MOVEMENT_KINDS } from "@/lib/movement"
import {
  FinancialWriteError,
  financialWriteErrorResponse,
  isValidOperationId,
  operationIdError,
  runFinancialWrite,
} from "@/lib/financialWrites"

export const dynamic = "force-dynamic"

const SHEET_NAME = "Tagihan"
const RANGE = `${SHEET_NAME}!A:M`

async function fetchAllBills(accessToken, spreadsheetId) {
  const rows = await getSheetData(accessToken, RANGE, spreadsheetId)
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0] || !row[1]) continue
    out.push(rowToBill(row, i + 1))
  }
  return out
}

async function transactionExistsById(accessToken, sheetName, txId, spreadsheetId) {
  const rows = await getSheetData(accessToken, `${sheetName}!B:B`, spreadsheetId)
  return rows.some((row, index) => index > 0 && String(row?.[0] || "").trim() === txId)
}

async function readActiveCheckpoint(accessToken, spreadsheetId) {
  try {
    const rows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId)
    return resolveCheckpoint(readCheckpointSettings(rows))
  } catch {
    return resolveCheckpoint({})
  }
}

/**
 * Cheap read-only pre-check so a repeat submit never reserves quota. The
 * authoritative check still runs inside the serialized write.
 */
async function findRecordedPayment(accessToken, spreadsheetId, billId) {
  try {
    const all = await fetchAllBills(accessToken, spreadsheetId)
    const bill = all.find(candidate => candidate.id === String(billId))
    if (!bill || !["income", "expense"].includes(bill.tipe)) return null
    const targetSheet = bill.tipe === "income" ? "Pemasukan" : "Pengeluaran"
    const txId = `billpay:${bill.id}:${wibToday().tanggal}`
    if (await transactionExistsById(accessToken, targetSheet, txId, spreadsheetId)) {
      return { success: true, idempotent: true, message: "Pembayaran tagihan ini sudah tercatat hari ini" }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "bills", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) return financialWriteErrorResponse(operationIdError(operationId))
    if (!body.billId) return Response.json({ error: "billId required" }, { status: 400 })

    const recorded = await findRecordedPayment(auth.accessToken, auth.spreadsheetId, body.billId)
    if (recorded) return Response.json(recorded)

    const result = await runFinancialWrite({
      auth,
      operationId,
      kind: OPERATION_KINDS.billPayment,
      quotaUnits: 1,
      // Bill rows keep their existing cell semantics; only the transaction row
      // gains the new metadata columns.
      valueInputOption: "USER_ENTERED",
      prepare: async ({ accessToken, spreadsheetId }) => {
        const all = await fetchAllBills(accessToken, spreadsheetId)
        const bill = all.find(candidate => candidate.id === String(body.billId))
        if (!bill) {
          throw new FinancialWriteError("BILL_NOT_FOUND", "Tagihan tidak ditemukan", { status: 404 })
        }

        const { tanggal, formatted, monthName, year } = wibToday()
        const kategori = bill.kategoriTransaksi
        const amount = bill.jumlah
        const targetSheet = bill.tipe === "income" ? "Pemasukan" : "Pengeluaran"

        if (!["income", "expense"].includes(bill.tipe) || !Number.isFinite(amount) || amount <= 0 || !String(kategori || "").trim()) {
          throw new FinancialWriteError("INVALID_BILL", "Data tagihan tidak valid", { status: 400 })
        }

        // One payment per bill per day, keyed by the stable ledger id so a
        // duplicate submit cannot record the expense twice.
        const txId = `billpay:${bill.id}:${tanggal}`
        if (await transactionExistsById(accessToken, targetSheet, txId, spreadsheetId)) {
          return {
            shortCircuit: true,
            response: {
              success: true,
              idempotent: true,
              message: "Pembayaran tagihan ini sudah tercatat hari ini",
            },
          }
        }

        if (targetSheet === "Pengeluaran") await ensureExpenseClassHeader(accessToken, spreadsheetId)

        const checkpoint = await readActiveCheckpoint(accessToken, spreadsheetId)
        const targetRow = await findNextEmptyRow(accessToken, targetSheet, spreadsheetId)

        const txRow = buildLedgerRow({
          tab: targetSheet,
          tanggal,
          id: txId,
          keterangan: `Bayar tagihan: ${bill.nama}`,
          kategori,
          amount,
          akunBank: bill.akunBank,
          catatan: bill.catatan || "",
          sifat: "Rutin",
          movementKind: targetSheet === "Pengeluaran" ? MOVEMENT_KINDS.operationalExpense : MOVEMENT_KINDS.operationalIncome,
          checkpointId: checkpoint.checkpointId,
          recordedAt: new Date().toISOString(),
        })

        const billRow = [
          bill.id, bill.nama, bill.jumlah, bill.tipe, bill.kategoriBill, bill.kategoriTransaksi,
          bill.frekuensi, bill.tanggalJatuhTempo, bill.akunBank, bill.aktif ? "TRUE" : "FALSE",
          tanggal, bill.catatan, bill.createdAt,
        ]

        return {
          data: [
            { range: `${SHEET_NAME}!A${bill.rowIndex}:M${bill.rowIndex}`, values: [billRow] },
            { range: ledgerRange(targetSheet, targetRow), values: [txRow] },
          ],
          relatedId: `${targetSheet}!A${targetRow}`,
          response: {
            message: "Tagihan dibayar dan transaksi dibuat",
            transaction: {
              sheet: targetSheet,
              row: targetRow,
              kategori,
              jumlah: amount,
              keterangan: `Bayar tagihan: ${bill.nama}`,
              tanggal,
              formatted,
              month: monthName,
              year,
            },
          },
        }
      },
    })

    return Response.json(result.response)
  } catch (error) {
    const mapped = financialWriteErrorResponse(error)
    if (mapped) return mapped
    if (error?.code === "FEATURE_LIMIT_REACHED" || error?.code === "ENTITLEMENT_UNAVAILABLE") {
      return quotaErrorResponse(error)
    }
    console.error("[Bills PAY]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
