import { getAuthContext } from "@/lib/apiAuth"
import { findNextEmptyRow, getSheetData } from "@/lib/sheets"
import { quotaErrorResponse } from "@/lib/transactionQuota"
import { OPERATION_KINDS } from "@/lib/financialOperations"
import { buildCheckpointSettingsRows, createCheckpointId, parseCheckpointBalance } from "@/lib/checkpoint"
import {
  FinancialWriteError,
  financialWriteErrorResponse,
  isValidOperationId,
  operationIdError,
  runFinancialWrite,
} from "@/lib/financialWrites"

export const dynamic = "force-dynamic"

const SETTINGS_SHEET = "Settings"
const MAX_BALANCE = 999999999999

/**
 * Saving `Total saldo saat ini` mints a new checkpoint id. Later cash rows
 * inherit that id, so the adjustment never depends on transaction dates and the
 * same day's rows are never counted twice.
 */
export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) return financialWriteErrorResponse(operationIdError(operationId))

    const balance = parseCheckpointBalance(body?.amount)
    if (balance === null || balance > MAX_BALANCE) {
      return Response.json({ error: "Total saldo saat ini tidak valid" }, { status: 400 })
    }

    const checkpointId = createCheckpointId()
    const recordedAt = new Date().toISOString()

    const result = await runFinancialWrite({
      auth,
      operationId,
      kind: OPERATION_KINDS.balanceCheckpoint,
      // A checkpoint is not a ledger row, so it never consumes transaction quota.
      quotaUnits: 0,
      prepare: async ({ accessToken, spreadsheetId }) => {
        const rows = await getSheetData(accessToken, `${SETTINGS_SHEET}!A:B`, spreadsheetId).catch(() => [])

        const rowForKey = new Map()
        for (let i = 0; i < rows.length; i++) {
          const key = String(rows[i]?.[0] || "").trim().toLowerCase()
          if (key && !rowForKey.has(key)) rowForKey.set(key, i + 1)
        }

        const entries = buildCheckpointSettingsRows({ balance, checkpointId, recordedAt })

        const data = []
        let appendRow = null
        for (const [key, value] of entries) {
          const existingRow = rowForKey.get(key.toLowerCase())
          if (existingRow) {
            data.push({ range: `${SETTINGS_SHEET}!A${existingRow}:B${existingRow}`, values: [[key, value]] })
            continue
          }
          if (appendRow === null) {
            appendRow = await findNextEmptyRow(accessToken, SETTINGS_SHEET, spreadsheetId)
          }
          data.push({ range: `${SETTINGS_SHEET}!A${appendRow}:B${appendRow}`, values: [[key, value]] })
          rowForKey.set(key.toLowerCase(), appendRow)
          appendRow += 1
        }

        return {
          data,
          relatedId: checkpointId,
          response: {
            balance,
            checkpointId,
            recordedAt,
            provisional: false,
            message: "Total saldo saat ini tersimpan",
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
    if (error instanceof FinancialWriteError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error("[BalanceCheckpoint]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
