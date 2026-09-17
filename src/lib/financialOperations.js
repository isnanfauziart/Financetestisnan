import { getSheetData } from "./sheets"
import { OPERATIONS_SHEET, describeOperationsSchema } from "./financialSchema"

/**
 * `_ArtamiOperations` is the committed-operation ledger.
 *
 * It stores only the operation id, its kind, the related record id, and when it
 * committed. The receipt is written in the same `spreadsheets.batchUpdate` call
 * as the mutation, so a receipt exists exactly when the mutation landed. No
 * financial amount, category, or note is stored here.
 */
export const OPERATIONS_RANGE = describeOperationsSchema().readRange

export const OPERATION_KINDS = {
  transactionCreate: "transaction_create",
  transactionUpdate: "transaction_update",
  transactionDelete: "transaction_delete",
  transactionUndo: "transaction_undo",
  billPayment: "bill_payment",
  debtCreate: "debt_create",
  debtPayment: "debt_payment",
  balanceCheckpoint: "balance_checkpoint",
  savingsAssign: "savings_assign",
  savingsRelease: "savings_release",
  goalSpend: "goal_spend",
}

export function operationReceiptRow({ operationId, kind, relatedId = "", committedAt }) {
  return [operationId, kind, relatedId || "", committedAt]
}

export const RECEIPT_COLUMN_COUNT = OPERATIONS_SHEET.headers.length

/**
 * A missing receipt tab proves nothing has ever committed — the schema upgrade
 * creates the tab before the first commit — so absence is knowable. Any other
 * read failure stays an error: reporting "no receipts" for an unreadable table
 * would allow a retry that duplicates a committed row.
 */
export function isMissingRangeError(error) {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("unable to parse range") || message.includes("range") && message.includes("not found")
}

export async function readOperationReceipts(accessToken, spreadsheetId) {
  let rows
  try {
    rows = await getSheetData(accessToken, OPERATIONS_RANGE, spreadsheetId)
  } catch (error) {
    if (isMissingRangeError(error)) return []
    throw error
  }
  const receipts = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const operationId = String(row?.[0] || "").trim()
    if (!operationId) continue
    receipts.push({
      rowIndex: i + 1,
      operationId,
      kind: String(row?.[1] || "").trim(),
      relatedId: String(row?.[2] || "").trim(),
      committedAt: String(row?.[3] || "").trim(),
    })
  }
  return receipts
}

/**
 * Returns the receipt for one operation, or `null` when the operation has not
 * committed. Throws only when the receipt table itself cannot be read.
 */
export async function findOperationReceipt(accessToken, spreadsheetId, operationId) {
  const target = String(operationId || "").trim()
  if (!target) return null
  const receipts = await readOperationReceipts(accessToken, spreadsheetId)
  return receipts.find(receipt => receipt.operationId === target) || null
}
