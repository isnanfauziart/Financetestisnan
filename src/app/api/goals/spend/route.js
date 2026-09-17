import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { ensureExpenseClassHeader, findNextEmptyRow, getSheetData } from "@/lib/sheets"
import { quotaErrorResponse } from "@/lib/transactionQuota"
import { OPERATION_KINDS } from "@/lib/financialOperations"
import { buildLedgerRow, isValidIsoDate, ledgerRange, wibToday } from "@/lib/ledgerRows"
import { resolveCheckpoint, readCheckpointSettings } from "@/lib/checkpoint"
import { MOVEMENT_KINDS } from "@/lib/movement"
import { ALLOCATION_STATUS, classifySavingsRows } from "@/lib/savingsAllocation"
import { parsePositiveAmount } from "@/lib/validation"
import {
  FinancialWriteError,
  financialWriteErrorResponse,
  isValidOperationId,
  operationIdError,
  runFinancialWrite,
} from "@/lib/financialWrites"

export const dynamic = "force-dynamic"

const TAB = "Tabungan"
const RANGE = `${TAB}!A:U`
const MAX_AMOUNT = 999999999999
const ALLOWED_EXPENSE_CLASSES = ["Rutin", "Spesial"]

async function readActiveCheckpoint(accessToken, spreadsheetId) {
  try {
    const rows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId)
    return resolveCheckpoint(readCheckpointSettings(rows))
  } catch {
    return resolveCheckpoint({})
  }
}

/**
 * `Gunakan untuk pengeluaran` is one coherent action: the expense is recorded
 * and the matching reservations are reduced by the same amount, so available
 * funds stay unchanged by the funded portion.
 */
export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "goals", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) return financialWriteErrorResponse(operationIdError(operationId))

    const goalId = String(body?.goalId || "").trim()
    if (!goalId) return Response.json({ error: "Target tabungan wajib dipilih", code: "GOAL_REQUIRED" }, { status: 400 })

    const amount = parsePositiveAmount(body?.amount, { max: MAX_AMOUNT })
    if (amount === null) {
      return Response.json({ error: "Jumlah harus antara 1 dan 999.999.999.999" }, { status: 400 })
    }

    const tanggal = String(body?.tanggal || "").trim()
    if (tanggal && !isValidIsoDate(tanggal)) return Response.json({ error: "Tanggal tidak valid" }, { status: 400 })

    const kategori = String(body?.kategori || "").trim()
    if (!kategori) return Response.json({ error: "Kategori pengeluaran wajib dipilih" }, { status: 400 })

    const expenseClass = String(body?.sifat ?? "").trim()
    if (expenseClass && !ALLOWED_EXPENSE_CLASSES.includes(expenseClass)) {
      return Response.json({ error: "Sifat pengeluaran tidak valid" }, { status: 400 })
    }

    const result = await runFinancialWrite({
      auth,
      operationId,
      kind: OPERATION_KINDS.goalSpend,
      // Goal-funded spending writes one expense row.
      quotaUnits: 1,
      prepare: async ({ accessToken, spreadsheetId }) => {
        const rows = await getSheetData(accessToken, RANGE, spreadsheetId).catch(() => [])
        const allocations = classifySavingsRows(rows)
          .filter(allocation => allocation.goalId === goalId
            && allocation.status !== ALLOCATION_STATUS.released
            && allocation.remaining > 0)
          .sort((a, b) => a.rowIndex - b.rowIndex)

        const available = allocations.reduce((sum, allocation) => sum + allocation.remaining, 0)
        if (available < amount) {
          throw new FinancialWriteError("INSUFFICIENT_ALLOCATION", "Alokasi target tidak mencukupi", { status: 400 })
        }

        let outstanding = amount
        const allocationWrites = []
        for (const allocation of allocations) {
          if (outstanding <= 0) break
          const consumed = Math.min(allocation.remaining, outstanding)
          outstanding -= consumed
          const nextRemaining = allocation.remaining - consumed
          allocationWrites.push({
            range: `${TAB}!Q${allocation.rowIndex}:R${allocation.rowIndex}`,
            values: [[allocation.status, nextRemaining]],
          })
        }

        await ensureExpenseClassHeader(accessToken, spreadsheetId)
        const checkpoint = await readActiveCheckpoint(accessToken, spreadsheetId)
        const targetRow = await findNextEmptyRow(accessToken, "Pengeluaran", spreadsheetId)
        const tanggalInput = tanggal || wibToday().tanggal

        const expenseRow = buildLedgerRow({
          tab: "Pengeluaran",
          tanggal: tanggalInput,
          keterangan: body?.keterangan || "Pengeluaran dari target",
          kategori,
          amount,
          akunBank: body?.akunBank || "",
          catatan: body?.catatan || "",
          sifat: expenseClass || "Rutin",
          movementKind: MOVEMENT_KINDS.goalFundedExpense,
          checkpointId: checkpoint.checkpointId,
          relatedRecordId: goalId,
          recordedAt: new Date().toISOString(),
        })

        return {
          data: [
            { range: ledgerRange("Pengeluaran", targetRow), values: [expenseRow] },
            ...allocationWrites,
          ],
          relatedId: `Pengeluaran!A${targetRow}`,
          response: {
            goalId,
            amount,
            rowIndex: targetRow,
            fundedRows: allocationWrites.length,
            message: "Pengeluaran dari target tersimpan",
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
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Data permintaan tidak valid" }, { status: 400 })
    }
    console.error("[GoalsSpend]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
