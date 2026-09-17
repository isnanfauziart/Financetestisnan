import "server-only"
import { batchUpdateSheetValues, findNextEmptyRow } from "./sheets"
import { claimRecordCreation, releaseRecordCreation } from "./recordQuota"
import { claimFeatureWrite, releaseFeatureWrite } from "./writeClaims"
import { releaseTransaction, reserveTransaction } from "./transactionQuota"
import { SchemaConflictError, ensureFinancialSchema } from "./financialSchema"
import { OPERATIONS_SHEET } from "./financialSchema"
import { findOperationReceipt, operationReceiptRow } from "./financialOperations"

/**
 * Every money-moving action runs through this pipeline:
 *
 *   1. a client-generated operation id, checked against the receipt ledger;
 *   2. a durable `op:<id>` write claim for replay protection;
 *   3. one serialized financial-write lock per user;
 *   4. one optional monthly quota reservation;
 *   5. an additive schema upgrade when the spreadsheet needs new columns;
 *   6. one atomic `spreadsheets.batchUpdate` carrying the mutation and its receipt.
 *
 * Nothing is released until the outcome is known: when the commit call fails we
 * re-read the receipt first. A receipt means the write landed, a confirmed
 * absence releases the claim and quota, and an unreadable receipt keeps the
 * claim so the client can resolve it with "Periksa lagi" instead of retrying
 * blindly.
 */

export const FINANCIAL_LOCK_KEY = "financial-write"

export const FINANCIAL_WRITE_STATUS = {
  committed: "committed",
  alreadyCommitted: "already_committed",
}

const OPERATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidOperationId(value) {
  return OPERATION_ID_PATTERN.test(String(value || "").trim())
}

export class FinancialWriteError extends Error {
  constructor(code, message, { status = 400, retryable = false, operationId = "", cause } = {}) {
    super(message)
    this.name = "FinancialWriteError"
    this.code = code
    this.status = status
    this.retryable = retryable
    this.operationId = operationId
    if (cause) this.cause = cause
  }
}

export function operationIdError(operationId) {
  return new FinancialWriteError("OPERATION_ID_REQUIRED", "Operation ID tidak valid atau tidak dikirim", {
    status: 400,
    operationId: String(operationId || "").trim(),
  })
}

export function committedPayload(operationId, extra = {}) {
  return { ...extra, success: true, operationId, status: FINANCIAL_WRITE_STATUS.committed }
}

export function replayedPayload(operationId, receipt = null, extra = {}) {
  return {
    ...extra,
    success: true,
    operationId,
    status: FINANCIAL_WRITE_STATUS.alreadyCommitted,
    committedAt: receipt?.committedAt || "",
    relatedId: receipt?.relatedId || "",
  }
}

export function financialWriteErrorResponse(error) {
  if (error instanceof SchemaConflictError) {
    return Response.json({
      error: "Struktur Google Sheets perlu ditinjau agar data baru dapat disimpan",
      code: "SCHEMA_CONFLICT",
      readOnly: true,
      conflicts: (error.plan?.conflicts || []).map(conflict => ({
        tab: conflict.tab,
        column: conflict.column,
        expected: conflict.header,
      })),
    }, { status: 409 })
  }

  switch (error?.code) {
    case "OPERATION_ID_REQUIRED":
      return Response.json({
        error: "Permintaan ini membutuhkan ID operasi",
        code: "OPERATION_ID_REQUIRED",
        retryable: false,
      }, { status: 400 })
    case "OPERATION_IN_FLIGHT":
      return Response.json({
        error: "Operasi ini sedang diproses",
        code: "OPERATION_IN_FLIGHT",
        retryable: true,
        operationId: error.operationId,
      }, { status: 409, headers: { "Retry-After": "2" } })
    case "FINANCIAL_WRITE_BUSY":
      return Response.json({
        error: "Penyimpanan lain sedang diproses. Coba lagi sebentar.",
        code: "FINANCIAL_WRITE_BUSY",
        retryable: true,
      }, { status: 409, headers: { "Retry-After": "2" } })
    case "TRANSACTION_NOT_FOUND":
    case "DEBT_NOT_FOUND":
    case "BILL_NOT_FOUND":
      return Response.json({
        error: error.message || "Data tidak ditemukan",
        code: error.code,
        retryable: false,
      }, { status: 404 })
    case "ALLOCATION_STALE":
      return Response.json({
        error: "Daftar tabungan berubah. Muat ulang lalu pilih kembali.",
        code: "ALLOCATION_STALE",
        stale: true,
        retryable: true,
      }, { status: 409 })
    case "INSUFFICIENT_ALLOCATION":
      return Response.json({
        error: "Alokasi target tidak mencukupi",
        code: "INSUFFICIENT_ALLOCATION",
        retryable: false,
      }, { status: 400 })
    case "DEBT_SETTLED":
    case "INVALID_BILL":
    case "INVALID_PAYMENT":
    case "FINANCIAL_WRITE_EMPTY":
      return Response.json({
        error: error.message || "Permintaan tidak valid",
        code: error.code,
        retryable: false,
      }, { status: 400 })
    case "UNDO_ROW_OCCUPIED":
      return Response.json({
        error: "Undo sudah digunakan atau baris telah terisi",
        code: "UNDO_ROW_OCCUPIED",
        retryable: false,
      }, { status: 409 })
    case "GOAL_NOT_FOUND":
      return Response.json({
        error: "Target tabungan tidak ditemukan",
        code: "GOAL_NOT_FOUND",
        retryable: false,
      }, { status: 400 })
    case "OPERATION_UNRESOLVED":
      return Response.json({
        error: "Status operasi belum dapat dipastikan",
        code: "OPERATION_UNRESOLVED",
        retryable: false,
        unresolved: true,
        operationId: error.operationId,
      }, { status: 503 })
    default:
      return null
  }
}

function nowIso() {
  return new Date().toISOString()
}

async function resolveCommittedReceipt(accessToken, spreadsheetId, operationId) {
  try {
    return await findOperationReceipt(accessToken, spreadsheetId, operationId)
  } catch {
    return "unknown"
  }
}

/**
 * @param prepare async ({ accessToken, spreadsheetId, operationId, kind }) =>
 *                { data: [{ range, values }], relatedId?, response? }
 */
export async function runFinancialWrite({
  auth,
  operationId,
  kind,
  quotaUnits = 1,
  valueInputOption = "RAW",
  prepare,
}) {
  const normalizedId = String(operationId || "").trim()
  if (!isValidOperationId(normalizedId) || typeof prepare !== "function") {
    throw operationIdError(normalizedId)
  }

  const { accessToken, spreadsheetId } = auth
  const writeKey = `op:${normalizedId}`

  const existing = await resolveCommittedReceipt(accessToken, spreadsheetId, normalizedId)
  if (existing && existing !== "unknown") {
    return { replayed: true, response: replayedPayload(normalizedId, existing) }
  }

  if (!await claimFeatureWrite(auth.user.id, writeKey)) {
    const receipt = await resolveCommittedReceipt(accessToken, spreadsheetId, normalizedId)
    if (receipt && receipt !== "unknown") {
      return { replayed: true, response: replayedPayload(normalizedId, receipt) }
    }
    throw new FinancialWriteError("OPERATION_IN_FLIGHT", "Operasi ini sedang diproses", {
      status: 409,
      retryable: true,
      operationId: normalizedId,
    })
  }

  let reservation = null
  let lockToken = null
  let committed = false

  try {
    try {
      lockToken = await claimRecordCreation(auth.user.id, FINANCIAL_LOCK_KEY)
    } catch (error) {
      throw new FinancialWriteError("FINANCIAL_WRITE_BUSY", "Penyimpanan lain sedang diproses. Coba lagi sebentar.", {
        status: 409,
        retryable: true,
        operationId: normalizedId,
        cause: error,
      })
    }
    if (!lockToken) {
      throw new FinancialWriteError("FINANCIAL_WRITE_BUSY", "Penyimpanan lain sedang diproses. Coba lagi sebentar.", {
        status: 409,
        retryable: true,
        operationId: normalizedId,
      })
    }

    if (quotaUnits > 0) reservation = await reserveTransaction(auth)

    await ensureFinancialSchema(accessToken, spreadsheetId)

    const prepared = await prepare({ accessToken, spreadsheetId, operationId: normalizedId, kind })

    // A guarded no-op (an already recorded payment, for example) resolves the
    // operation without writing a row or consuming quota.
    if (prepared?.shortCircuit) {
      await releaseTransaction(reservation).catch(() => {})
      reservation = null
      await releaseFeatureWrite(auth.user.id, writeKey).catch(() => {})
      return { shortCircuited: true, response: prepared.response || {} }
    }

    const data = [...(prepared?.data || [])]
    if (data.length === 0) {
      throw new FinancialWriteError("FINANCIAL_WRITE_EMPTY", "Tidak ada perubahan yang dapat disimpan", {
        status: 400,
        operationId: normalizedId,
      })
    }

    const receiptRowIndex = await findNextEmptyRow(accessToken, OPERATIONS_SHEET.name, spreadsheetId)
    const receipt = {
      operationId: normalizedId,
      kind,
      relatedId: prepared?.relatedId || "",
      committedAt: nowIso(),
    }
    data.push({
      range: `${OPERATIONS_SHEET.name}!A${receiptRowIndex}:D${receiptRowIndex}`,
      values: [operationReceiptRow(receipt)],
    })

    await batchUpdateSheetValues(accessToken, spreadsheetId, data, valueInputOption)
    committed = true

    return {
      replayed: false,
      receipt: { ...receipt, rowIndex: receiptRowIndex },
      response: committedPayload(normalizedId, prepared?.response || {}),
    }
  } catch (error) {
    if (committed) throw error

    // The mutation is atomic with its receipt, so the receipt settles the outcome.
    const receipt = await resolveCommittedReceipt(accessToken, spreadsheetId, normalizedId)
    if (receipt && receipt !== "unknown") {
      return { replayed: false, resolvedAfterFailure: true, receipt, response: committedPayload(normalizedId) }
    }
    if (receipt === "unknown") {
      throw new FinancialWriteError("OPERATION_UNRESOLVED", "Status operasi belum dapat dipastikan", {
        status: 503,
        retryable: false,
        operationId: normalizedId,
        cause: error,
      })
    }

    await releaseTransaction(reservation).catch(() => {})
    reservation = null
    await releaseFeatureWrite(auth.user.id, writeKey).catch(() => {})
    throw error
  } finally {
    if (lockToken) {
      try {
        await releaseRecordCreation(auth.user.id, FINANCIAL_LOCK_KEY, lockToken)
      } catch (error) {
        console.error("[FinancialWrite] Failed to release financial lock:", error)
      }
    }
  }
}

/** Replay-safe lookup used by `GET /api/financial-operations/[operationId]`. */
export async function lookupFinancialOperation(accessToken, spreadsheetId, operationId) {
  const normalizedId = String(operationId || "").trim()
  if (!isValidOperationId(normalizedId)) {
    throw new FinancialWriteError("OPERATION_ID_REQUIRED", "Operation ID tidak valid", {
      status: 400,
      operationId: normalizedId,
    })
  }
  let receipt
  try {
    receipt = await findOperationReceipt(accessToken, spreadsheetId, normalizedId)
  } catch (error) {
    // Never claim absence from an unreadable receipt table; the client keeps the
    // operation pending and offers "Periksa lagi" instead of retrying blindly.
    return { resolved: false, committed: null, status: "unresolved", error }
  }
  if (receipt) {
    return { resolved: true, committed: true, status: FINANCIAL_WRITE_STATUS.alreadyCommitted, receipt }
  }
  return { resolved: true, committed: false, status: "not_committed" }
}
