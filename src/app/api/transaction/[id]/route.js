import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { ensureExpenseClassHeader, getSheetData } from "@/lib/sheets"
import { expenseClassToSheet } from "@/lib/expenseClass"
import { createUndoToken } from "@/lib/transactionUndo"
import { quotaErrorResponse } from "@/lib/transactionQuota"
import { OPERATION_KINDS } from "@/lib/financialOperations"
import { formatSheetDate, isValidIsoDate, ledgerRange, ledgerWidth, sheetMonthParts } from "@/lib/ledgerRows"
import {
  FinancialWriteError,
  financialWriteErrorResponse,
  isValidOperationId,
  operationIdError,
  runFinancialWrite,
} from "@/lib/financialWrites"

export const dynamic = "force-dynamic"

const ALLOWED_TABS = ["Pemasukan", "Pengeluaran", "Tabungan"]
const FALLBACK_ID_PREFIXES = { Pemasukan: "in", Pengeluaran: "ex", Tabungan: "sv" }
const ALLOWED_EXPENSE_CLASSES = ["Rutin", "Spesial"]

function getExpectedId(tab, rowIndex, persistedId) {
  return persistedId || `${FALLBACK_ID_PREFIXES[tab]}-${rowIndex - 1}`
}

function validateUpdateBody(body) {
  const { tab, tanggal, kategori, jumlah, sifat, rowIndex } = body || {}
  if (!ALLOWED_TABS.includes(tab) || !Number.isInteger(rowIndex) || rowIndex < 2 || !tanggal || !kategori || !jumlah) {
    return { error: "Missing required fields" }
  }
  if (!isValidIsoDate(tanggal)) return { error: "Tanggal tidak valid" }

  const isExpense = tab === "Pengeluaran"
  const requestedExpenseClass = String(sifat ?? "").trim()
  if (isExpense && Object.prototype.hasOwnProperty.call(body, "sifat")
    && requestedExpenseClass && !ALLOWED_EXPENSE_CLASSES.includes(requestedExpenseClass)) {
    return { error: "Sifat pengeluaran tidak valid" }
  }

  const rawAmount = String(jumlah).trim()
  const amount = Number(rawAmount.replace(/[^0-9.]/g, ""))
  if (rawAmount.includes("-") || !Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
    return { error: "Jumlah harus antara 1 dan 999.999.999.999" }
  }

  return { value: { tab, rowIndex, tanggal, kategori, amount, isExpense, requestedExpenseClass } }
}

function notFoundError() {
  return new FinancialWriteError("TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan", { status: 404 })
}

async function readTargetRow(accessToken, spreadsheetId, tab, rowIndex) {
  const rows = await getSheetData(accessToken, ledgerRange(tab, rowIndex), spreadsheetId)
  const width = ledgerWidth(tab)
  return Array.from({ length: width }, (_, index) => rows[0]?.[index] ?? "")
}

export async function PUT(request, { params }) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "transactions", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) return financialWriteErrorResponse(operationIdError(operationId))

    const validation = validateUpdateBody(body)
    if (validation.error) return Response.json({ error: validation.error }, { status: 400 })
    const input = validation.value
    const requestedId = String(params?.id || "").trim()

    const result = await runFinancialWrite({
      auth,
      operationId,
      kind: OPERATION_KINDS.transactionUpdate,
      // An edit rewrites an existing row; it never consumes another quota unit.
      quotaUnits: 0,
      prepare: async ({ accessToken: token, spreadsheetId: sheetId }) => {
        if (input.isExpense) await ensureExpenseClassHeader(token, sheetId)

        const existing = await readTargetRow(token, sheetId, input.tab, input.rowIndex)
        if (!existing.some(cell => String(cell).trim())) throw notFoundError()
        if (requestedId !== getExpectedId(input.tab, input.rowIndex, String(existing[1]).trim())) throw notFoundError()

        const row = existing.slice()
        row[0] = formatSheetDate(input.tanggal)
        row[1] = existing[1]
        row[2] = body.keterangan || ""
        row[3] = input.kategori
        row[4] = input.amount
        row[7] = body.akunBank || ""
        row[8] = input.amount
        if (Object.prototype.hasOwnProperty.call(body, "eventId")) row[13] = body.eventId || ""
        if (Object.prototype.hasOwnProperty.call(body, "eventSubKategori")) row[14] = body.eventSubKategori || ""
        if (input.isExpense) {
          row[15] = Object.prototype.hasOwnProperty.call(body, "sifat")
            ? expenseClassToSheet(input.requestedExpenseClass)
            : expenseClassToSheet(existing[15])
        }

        // Keep the month/year columns aligned with the (possibly new) date so
        // balances and monthly cash flow never disagree with the row date.
        const { monthName, year } = sheetMonthParts(input.tanggal)
        if (monthName) row[10] = monthName
        if (year) {
          row[11] = Number(year)
          row[12] = Number(year)
        }

        return {
          data: [{ range: ledgerRange(input.tab, input.rowIndex), values: [row] }],
          relatedId: `${input.tab}!A${input.rowIndex}`,
          response: { message: "Transaksi diperbarui" },
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
    console.error("[TransactionId]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "transactions", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) return financialWriteErrorResponse(operationIdError(operationId))

    const { tab, rowIndex } = body || {}
    if (!ALLOWED_TABS.includes(tab) || !Number.isInteger(rowIndex) || rowIndex < 2) {
      return Response.json({ error: "Missing tab or rowIndex" }, { status: 400 })
    }

    const requestedId = String(params?.id || "").trim()

    const result = await runFinancialWrite({
      auth,
      operationId,
      kind: OPERATION_KINDS.transactionDelete,
      // Deleting frees a record slot and never consumes a quota unit.
      quotaUnits: 0,
      prepare: async ({ accessToken, spreadsheetId }) => {
        if (tab === "Pengeluaran") await ensureExpenseClassHeader(accessToken, spreadsheetId)

        const row = await readTargetRow(accessToken, spreadsheetId, tab, rowIndex)
        if (!row.some(cell => String(cell).trim())) throw notFoundError()
        if (requestedId !== getExpectedId(tab, rowIndex, String(row[1]).trim())) throw notFoundError()

        const undoToken = createUndoToken({
          userId: auth.user.id,
          spreadsheetId,
          tab,
          rowIndex,
          row,
        })

        return {
          data: [{ range: ledgerRange(tab, rowIndex), values: [Array(ledgerWidth(tab)).fill("")] }],
          relatedId: `${tab}!A${rowIndex}`,
          response: { message: "Transaksi dihapus", undoToken },
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
    console.error("[TransactionId]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
