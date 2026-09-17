import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { ensureExpenseClassHeader, findNextEmptyRow, getSheetData } from "@/lib/sheets"
import { quotaErrorResponse } from "@/lib/transactionQuota"
import { verifyUndoToken } from "@/lib/transactionUndo"
import { OPERATION_KINDS } from "@/lib/financialOperations"
import { buildLedgerRow, isValidIsoDate, ledgerRange, ledgerWidth } from "@/lib/ledgerRows"
import { resolveCheckpoint, readCheckpointSettings } from "@/lib/checkpoint"
import { MOVEMENT_KINDS } from "@/lib/movement"
import { parsePositiveAmount } from "@/lib/validation"
import {
  FinancialWriteError,
  financialWriteErrorResponse,
  isValidOperationId,
  operationIdError,
  runFinancialWrite,
} from "@/lib/financialWrites"

export const dynamic = "force-dynamic"

const ALLOWED_TYPES = ["income", "expense", "savings"]
const ALLOWED_TABS = ["Pemasukan", "Pengeluaran", "Tabungan"]
const ALLOWED_EXPENSE_CLASSES = ["Rutin", "Spesial"]
const TAB_FOR_TYPE = { income: "Pemasukan", expense: "Pengeluaran", savings: "Tabungan" }
const KIND_FOR_TYPE = {
  income: MOVEMENT_KINDS.operationalIncome,
  expense: MOVEMENT_KINDS.operationalExpense,
  savings: MOVEMENT_KINDS.savingsAllocation,
}

function validateCreate(body) {
  const { type = "expense", tanggal, keterangan, kategori, jumlah, akunBank, catatan, eventId, eventSubKategori, sifat, goalId } = body || {}
  if (!tanggal || !kategori || !jumlah) return { error: "Tanggal, kategori, dan jumlah wajib diisi" }
  if (!isValidIsoDate(tanggal)) return { error: "Tanggal tidak valid" }
  if (!ALLOWED_TYPES.includes(type)) return { error: "Tipe transaksi tidak valid" }

  const expenseClass = String(sifat ?? "").trim()
  if (type === "expense" && expenseClass && !ALLOWED_EXPENSE_CLASSES.includes(expenseClass)) {
    return { error: "Sifat pengeluaran tidak valid" }
  }

  const amount = parsePositiveAmount(jumlah)
  if (amount === null) {
    return { error: "Jumlah harus antara 1 dan 999.999.999.999" }
  }
  if (String(keterangan || "").length > 500 || String(kategori).length > 100 ||
      String(catatan || "").length > 1000 || String(akunBank || "").length > 100) {
    return { error: "Data transaksi terlalu panjang" }
  }

  const cleanGoalId = String(goalId || "").trim()
  if (type === "savings" && !cleanGoalId) {
    return { error: "Kontribusi tabungan harus dipilih targetnya", code: "GOAL_REQUIRED" }
  }
  if (cleanGoalId && Array.from(cleanGoalId).length > 40) {
    return { error: "Target tabungan tidak valid" }
  }

  return {
    value: {
      type,
      tanggal,
      keterangan: keterangan || "",
      kategori,
      amount,
      akunBank: akunBank || "",
      catatan: catatan || "",
      eventId: eventId || "",
      eventSubKategori: eventSubKategori || "",
      sifat: expenseClass,
      goalId: cleanGoalId,
    },
  }
}

async function readActiveCheckpoint(accessToken, spreadsheetId) {
  try {
    const rows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId)
    return resolveCheckpoint(readCheckpointSettings(rows))
  } catch {
    return resolveCheckpoint({})
  }
}

async function assertGoalExists(accessToken, spreadsheetId, goalId) {
  const rows = await getSheetData(accessToken, "Goals!A:A", spreadsheetId).catch(() => [])
  const exists = rows.some((row, index) => index > 0 && String(row?.[0] || "").trim() === goalId)
  if (!exists) {
    throw new FinancialWriteError("GOAL_NOT_FOUND", "Target tabungan tidak ditemukan", { status: 400 })
  }
}

async function createFinancialWrite(auth, body, operationId) {
  const validation = validateCreate(body)
  if (validation.error) return { status: 400, payload: { error: validation.error, ...(validation.code ? { code: validation.code } : {}) } }
  const input = validation.value
  const tab = TAB_FOR_TYPE[input.type]

  const result = await runFinancialWrite({
    auth,
    operationId,
    kind: OPERATION_KINDS.transactionCreate,
    quotaUnits: 1,
    prepare: async ({ accessToken, spreadsheetId }) => {
      if (input.type === "savings") await assertGoalExists(accessToken, spreadsheetId, input.goalId)
      if (tab === "Pengeluaran") await ensureExpenseClassHeader(accessToken, spreadsheetId)

      const checkpoint = await readActiveCheckpoint(accessToken, spreadsheetId)
      const rowIndex = await findNextEmptyRow(accessToken, tab, spreadsheetId)
      const row = buildLedgerRow({
        tab,
        tanggal: input.tanggal,
        keterangan: input.keterangan,
        kategori: input.kategori,
        amount: input.amount,
        akunBank: input.akunBank,
        catatan: input.catatan,
        eventId: input.eventId,
        eventSubKategori: input.eventSubKategori,
        sifat: input.sifat,
        goalId: input.goalId,
        allocationStatus: input.type === "savings" ? "allocated" : "",
        allocationRemaining: input.type === "savings" ? input.amount : "",
        movementKind: KIND_FOR_TYPE[input.type],
        checkpointId: checkpoint.checkpointId,
        recordedAt: new Date().toISOString(),
      })

      return {
        data: [{ range: ledgerRange(tab, rowIndex), values: [row] }],
        relatedId: `${tab}!A${rowIndex}`,
        response: { message: `Transaksi berhasil disimpan ke tab ${tab}`, rowIndex },
      }
    },
  })

  return { status: 200, payload: result.response }
}

async function undoFinancialWrite(auth, body, operationId) {
  let undo
  try {
    undo = verifyUndoToken(body.undoToken, {
      userId: auth.user.id,
      spreadsheetId: auth.spreadsheetId,
    })
  } catch {
    return { status: 400, payload: { error: "Undo tidak valid atau sudah kedaluwarsa" } }
  }
  if (!ALLOWED_TABS.includes(undo.tab) || !Number.isInteger(undo.rowIndex) || undo.rowIndex < 2 || !Array.isArray(undo.row)) {
    return { status: 400, payload: { error: "Undo tidak valid" } }
  }

  const result = await runFinancialWrite({
    auth,
    operationId,
    kind: OPERATION_KINDS.transactionUndo,
    // Undo restores a row that already consumed its quota unit; it never counts twice.
    quotaUnits: 0,
    prepare: async ({ accessToken, spreadsheetId }) => {
      if (undo.tab === "Pengeluaran") await ensureExpenseClassHeader(accessToken, spreadsheetId)
      const range = ledgerRange(undo.tab, undo.rowIndex)
      const current = await getSheetData(accessToken, range, spreadsheetId)
      if (current.some(row => row.some(cell => String(cell ?? "").trim()))) {
        throw new FinancialWriteError("UNDO_ROW_OCCUPIED", "Undo sudah digunakan atau baris telah terisi", { status: 409 })
      }
      const width = ledgerWidth(undo.tab)
      const row = Array.from({ length: width }, (_, index) => undo.row[index] ?? "")
      return { data: [{ range, values: [row] }], relatedId: `${undo.tab}!A${undo.rowIndex}`, response: { restored: true } }
    },
  })

  return { status: 200, payload: result.response }
}

function writeResponse({ status, payload }) {
  if (status === 200) return Response.json(payload)
  return Response.json(payload, { status })
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "transactions", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) {
      return financialWriteErrorResponse(operationIdError(operationId))
    }

    const outcome = body.undoToken
      ? await undoFinancialWrite(auth, body, operationId)
      : await createFinancialWrite(auth, body, operationId)

    return writeResponse(outcome)
  } catch (error) {
    const mapped = financialWriteErrorResponse(error)
    if (mapped) return mapped
    if (error?.code === "FEATURE_LIMIT_REACHED" || error?.code === "ENTITLEMENT_UNAVAILABLE") {
      return quotaErrorResponse(error)
    }
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Data permintaan tidak valid" }, { status: 400 })
    }
    console.error("[Transaction]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
