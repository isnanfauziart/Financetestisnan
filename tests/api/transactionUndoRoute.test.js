import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  appendSheetValues: vi.fn(),
  batchUpdateSheetValues: vi.fn(),
  ensureExpenseClassHeader: vi.fn(),
  findNextEmptyRow: vi.fn(),
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
  updateSheetValues: vi.fn(),
}))
vi.mock("@/lib/recordQuota", () => ({
  claimRecordCreation: vi.fn(),
  releaseRecordCreation: vi.fn(),
}))
vi.mock("@/lib/transactionQuota", () => ({
  reserveTransaction: vi.fn(),
  releaseTransaction: vi.fn(),
  quotaErrorResponse: vi.fn(),
}))
vi.mock("@/lib/writeClaims", () => ({
  claimFeatureWrite: vi.fn(),
  releaseFeatureWrite: vi.fn(),
}))
vi.mock("@/lib/financialSchema", async () => {
  const actual = await vi.importActual("@/lib/financialSchema")
  return { ...actual, ensureFinancialSchema: vi.fn() }
})
vi.mock("@/lib/financialOperations", async () => {
  const actual = await vi.importActual("@/lib/financialOperations")
  return { ...actual, findOperationReceipt: vi.fn() }
})

const UNDO_OPERATION = "11111111-2222-4333-8444-555555555555"
const REPLAY_OPERATION = "99999999-8888-4777-8666-555555555555"
const AUTH = { user: { id: "u1" }, spreadsheetId: "s1", accessToken: "token", tier: "paid" }

function post(body) {
  return new Request("http://localhost/api/transaction", { method: "POST", body: JSON.stringify(body) })
}

beforeEach(async () => {
  process.env.NEXTAUTH_SECRET = "test-secret"
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { batchUpdateSheetValues, ensureExpenseClassHeader, findNextEmptyRow, getSheetData } = await import("@/lib/sheets")
  const { claimRecordCreation, releaseRecordCreation } = await import("@/lib/recordQuota")
  const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
  const { claimFeatureWrite, releaseFeatureWrite } = await import("@/lib/writeClaims")
  const { ensureFinancialSchema } = await import("@/lib/financialSchema")
  const { findOperationReceipt } = await import("@/lib/financialOperations")

  getAuthContext.mockResolvedValue(AUTH)
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 6 : 2))
  batchUpdateSheetValues.mockResolvedValue({})
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue({ userId: "u1", period: "2026-08", current: 1 })
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
  getSheetData.mockResolvedValue([])
})

afterEach(() => {
  delete process.env.NEXTAUTH_SECRET
  vi.resetModules()
})

describe("transaction undo route", () => {
  it("restores the exact row once and blocks replay into a non-empty row", async () => {
    const { batchUpdateSheetValues, getSheetData } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { createUndoToken } = await import("@/lib/transactionUndo")
    const row = [
      "1 Jul 2026", "id", "Kopi", "Jajan", 15000, "", "", "BCA", 15000,
      "", "Jul", 2026, 2026, "", "", "Spesial",
    ]
    const token = createUndoToken({ userId: "u1", spreadsheetId: "s1", tab: "Pengeluaran", rowIndex: 2, row })
    const { POST } = await import("@/app/api/transaction/route")

    getSheetData.mockResolvedValueOnce([])
    const first = await POST(post({ undoToken: token, operationId: UNDO_OPERATION }))
    expect(first.status).toBe(200)
    expect((await first.json()).restored).toBe(true)

    // Undo restores an already-counted row, so it never consumes quota again.
    expect(reserveTransaction).not.toHaveBeenCalled()

    const writes = batchUpdateSheetValues.mock.calls[0][2]
    const restore = writes.find(entry => entry.range.startsWith("Pengeluaran!"))
    expect(restore.range).toBe("Pengeluaran!A2:T2")
    expect(restore.values[0].slice(0, 16)).toEqual(row)
    expect(restore.values[0]).toHaveLength(20)

    // A second attempt with a different operation id finds an occupied row.
    getSheetData.mockResolvedValueOnce([["1 Jul 2026", "id", "Kopi"]])
    const replay = await POST(post({ undoToken: token, operationId: REPLAY_OPERATION }))
    expect(replay.status).toBe(409)
    expect((await replay.json()).code).toBe("UNDO_ROW_OCCUPIED")
  })

  it("returns already_committed for a retry with the same operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    const { createUndoToken } = await import("@/lib/transactionUndo")
    const token = createUndoToken({
      userId: "u1",
      spreadsheetId: "s1",
      tab: "Pengeluaran",
      rowIndex: 2,
      row: ["1 Jul 2026", "id", "Kopi", "Jajan", 15000],
    })
    findOperationReceipt.mockResolvedValue({
      rowIndex: 6, operationId: UNDO_OPERATION, kind: "transaction_undo", relatedId: "Pengeluaran!A2", committedAt: "2026-07-01T00:00:00.000Z",
    })
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ undoToken: token, operationId: UNDO_OPERATION }))

    expect(response.status).toBe(200)
    expect((await response.json()).status).toBe("already_committed")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects a forged or expired undo token before writing", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ undoToken: "forged.token", operationId: UNDO_OPERATION }))

    expect(response.status).toBe(400)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects an undo token that belongs to another user", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { createUndoToken } = await import("@/lib/transactionUndo")
    const token = createUndoToken({
      userId: "someone-else",
      spreadsheetId: "s1",
      tab: "Pengeluaran",
      rowIndex: 2,
      row: ["1 Jul 2026", "id", "Kopi", "Jajan", 15000],
    })
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ undoToken: token, operationId: UNDO_OPERATION }))

    expect(response.status).toBe(400)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})
