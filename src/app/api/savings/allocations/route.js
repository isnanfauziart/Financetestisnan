import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { getSheetData } from "@/lib/sheets"
import { quotaErrorResponse } from "@/lib/transactionQuota"
import { OPERATION_KINDS } from "@/lib/financialOperations"
import { getLegacyCategories, parseStoredCategories, CATEGORIES_KEY } from "@/lib/categories"
import {
  ALLOCATION_STATUS,
  classifySavingsRows,
  savingsCategoryKinds,
  savingsRowFingerprint,
  summarizeAllocations,
} from "@/lib/savingsAllocation"
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
const MAX_SELECTIONS = 200
const MAX_FINGERPRINT_LENGTH = 400

export async function readSavingsAllocations(accessToken, spreadsheetId, { includeReleased = false } = {}) {
  const [rows, settingsRows] = await Promise.all([
    getSheetData(accessToken, RANGE, spreadsheetId).catch(() => []),
    getSheetData(accessToken, "Settings!A:B", spreadsheetId).catch(() => []),
  ])

  let categories = getLegacyCategories()
  for (const row of settingsRows || []) {
    if (String(row?.[0] || "").trim().toLowerCase() === CATEGORIES_KEY.toLowerCase()) {
      categories = parseStoredCategories(row[1]) || categories
    }
  }

  const categoryKinds = savingsCategoryKinds(categories)
  const classified = classifySavingsRows(rows, { categoryKinds })
  const visible = includeReleased
    ? classified
    : classified.filter(allocation => allocation.status !== ALLOCATION_STATUS.released)

  return {
    allocations: visible.map(allocation => ({
      ...allocation,
      fingerprint: savingsRowFingerprint(rows[allocation.rowIndex - 1], allocation.rowIndex),
    })),
    summary: summarizeAllocations(classified),
  }
}

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "goals", request)
  if (blocked) return blocked

  try {
    const includeReleased = new URL(request.url).searchParams.get("includeReleased") === "1"
    const result = await readSavingsAllocations(auth.accessToken, auth.spreadsheetId, { includeReleased })
    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error("[SavingsAllocations]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

function parseSelections(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SELECTIONS) return null
  const selections = []
  for (const entry of value) {
    const rowIndex = Number(entry?.rowIndex)
    const fingerprint = String(entry?.fingerprint || "")
    if (!Number.isInteger(rowIndex) || rowIndex < 2) return null
    if (!fingerprint || fingerprint.length > MAX_FINGERPRINT_LENGTH) return null
    selections.push({ rowIndex, fingerprint })
  }
  const unique = new Map(selections.map(selection => [selection.rowIndex, selection]))
  return [...unique.values()]
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const blocked = featureUnavailableResponse(auth, "goals", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) return financialWriteErrorResponse(operationIdError(operationId))

    const action = String(body?.action || "").trim().toLowerCase()
    if (!["assign", "release"].includes(action)) {
      return Response.json({ error: "action must be 'assign' or 'release'" }, { status: 400 })
    }
    const selections = parseSelections(body?.selections)
    if (!selections) {
      return Response.json({ error: "Pilihan tabungan tidak valid" }, { status: 400 })
    }

    const goalId = String(body?.goalId || "").trim()
    if (action === "assign") {
      if (!goalId) return Response.json({ error: "Target tabungan wajib dipilih", code: "GOAL_REQUIRED" }, { status: 400 })
      if (Array.from(goalId).length > 40) return Response.json({ error: "Target tabungan tidak valid" }, { status: 400 })
    }

    const result = await runFinancialWrite({
      auth,
      operationId,
      kind: action === "assign" ? OPERATION_KINDS.savingsAssign : OPERATION_KINDS.savingsRelease,
      // Assignment and release change allocation ownership; they write no ledger row.
      quotaUnits: 0,
      prepare: async ({ accessToken, spreadsheetId }) => {
        if (action === "assign") {
          const goalRows = await getSheetData(accessToken, "Goals!A:A", spreadsheetId).catch(() => [])
          const exists = goalRows.some((row, index) => index > 0 && String(row?.[0] || "").trim() === goalId)
          if (!exists) {
            throw new FinancialWriteError("GOAL_NOT_FOUND", "Target tabungan tidak ditemukan", { status: 400 })
          }
        }

        const rows = await getSheetData(accessToken, RANGE, spreadsheetId).catch(() => [])
        const current = new Map()
        // Only raw cells matter here: the fingerprint and the amount/status
        // fields do not depend on the category configuration.
        const classified = classifySavingsRows(rows)
        for (const allocation of classified) {
          const row = rows[allocation.rowIndex - 1]
          current.set(allocation.rowIndex, {
            allocation,
            fingerprint: savingsRowFingerprint(row, allocation.rowIndex),
            goalId: allocation.goalId,
          })
        }

        // All-or-nothing: if any selected row changed since the user saw it,
        // nothing is written and the caller reloads the list.
        for (const selection of selections) {
          const entry = current.get(selection.rowIndex)
          if (!entry || entry.fingerprint !== selection.fingerprint) {
            throw new FinancialWriteError(
              "ALLOCATION_STALE",
              "Daftar tabungan berubah. Muat ulang lalu pilih kembali.",
              { status: 409, retryable: true }
            )
          }
          if (entry.allocation.status === ALLOCATION_STATUS.released) {
            throw new FinancialWriteError(
              "ALLOCATION_STALE",
              "Daftar tabungan berubah. Muat ulang lalu pilih kembali.",
              { status: 409, retryable: true }
            )
          }
        }

        const data = selections.map(selection => {
          const entry = current.get(selection.rowIndex)
          if (action === "release") {
            return {
              range: `${TAB}!Q${selection.rowIndex}:R${selection.rowIndex}`,
              values: [[ALLOCATION_STATUS.released, 0]],
            }
          }
          const amount = entry.allocation.amount
          const remaining = entry.allocation.remaining > 0 ? entry.allocation.remaining : amount
          return {
            range: `${TAB}!P${selection.rowIndex}:R${selection.rowIndex}`,
            values: [[goalId, ALLOCATION_STATUS.allocated, remaining]],
          }
        })

        return {
          data,
          relatedId: action === "assign" ? goalId : "",
          response: {
            action,
            goalId: action === "assign" ? goalId : "",
            updated: selections.length,
            message: action === "assign"
              ? `${selections.length} tabungan dialokasikan ke target`
              : `${selections.length} alokasi dibatalkan`,
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
    console.error("[SavingsAllocations]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
