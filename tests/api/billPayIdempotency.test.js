import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  appendSheetValues: vi.fn(),
  batchUpdateSheetValues: vi.fn(),
  ensureBillSourceHeader: vi.fn(),
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

const OPERATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
const AUTH = { user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet-123", tier: "free", entitlementVerified: true }

const BILL_ROW = ["bill-1", "Internet", 300000, "expense", "Internet", "Tagihan", "monthly", "7", "BCA", "TRUE", "", "", "2026-01-01"]

function post(body) {
  return new Request("http://localhost/api/bills/pay", { method: "POST", body: JSON.stringify(body) })
}

function mockSheets({ existingPayment = false, transactionRows = [["Tanggal"]] } = {}) {
  return async (token, range) => {
    const target = String(range)
    if (target.startsWith("Tagihan")) return [["headers"], BILL_ROW]
    if (target.startsWith("Settings!")) return []
    if (target.endsWith("!B:B")) {
      return existingPayment ? [["ID"], ["billpay:bill-1:2026-08-12"]] : []
    }
    if (target.startsWith("Pengeluaran!A:A") || target.startsWith("Pemasukan!A:A")) return transactionRows
    return []
  }
}

beforeEach(async () => {
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
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 4 : 2))
  batchUpdateSheetValues.mockResolvedValue({})
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue({ userId: "u", period: "2026-08", current: 1 })
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
  getSheetData.mockImplementation(mockSheets())
})

afterEach(() => {
  vi.resetModules()
  vi.useRealTimers()
})

describe("bill payment", () => {
  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "bill-1" }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("does not reserve or write a duplicate when the transaction already exists", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-12T08:00:00.000Z"))
    const { batchUpdateSheetValues, getSheetData } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    getSheetData.mockImplementation(mockSheets({ existingPayment: true }))
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "bill-1", operationId: OPERATION_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, idempotent: true })
    expect(reserveTransaction).not.toHaveBeenCalled()
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("writes the expense and the bill update with one atomic call", async () => {
    const { batchUpdateSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "bill-1", operationId: OPERATION_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, operationId: OPERATION_ID, status: "committed" })
    expect(body.transaction.sheet).toBe("Pengeluaran")
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token", "sheet-123")

    const writes = batchUpdateSheetValues.mock.calls[0][2]
    expect(writes).toHaveLength(3)
    const transactionWrite = writes.find(entry => entry.range.startsWith("Pengeluaran!"))
    expect(transactionWrite.range).toBe("Pengeluaran!A2:T2")
    expect(transactionWrite.values[0]).toHaveLength(20)
    expect(transactionWrite.values[0][15]).toBe("Rutin")
    expect(transactionWrite.values[0][18]).toBe("operational_expense")
    expect(transactionWrite.values[0][3]).toBe("Tagihan")

    const billWrite = writes.find(entry => entry.range.startsWith("Tagihan!"))
    expect(billWrite.range).toBe("Tagihan!A2:M2")
    expect(billWrite.values[0][10]).toBe(body.transaction.tanggal)

    const receipt = writes.find(entry => entry.range.startsWith("_ArtamiOperations!"))
    expect(receipt.range).toBe("_ArtamiOperations!A4:D4")
    expect(receipt.values[0][1]).toBe("bill_payment")
  })

  it("returns 404 for an unknown bill without writing", async () => {
    const { batchUpdateSheetValues, getSheetData } = await import("@/lib/sheets")
    getSheetData.mockImplementation(async (token, range) => (String(range).startsWith("Tagihan") ? [["headers"]] : []))
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "missing", operationId: OPERATION_ID }))

    expect(response.status).toBe(404)
    expect((await response.json()).code).toBe("BILL_NOT_FOUND")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("releases quota and the claim when the atomic write fails", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { releaseTransaction } = await import("@/lib/transactionQuota")
    const { releaseFeatureWrite } = await import("@/lib/writeClaims")
    batchUpdateSheetValues.mockRejectedValue(new Error("Sheets down"))
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "bill-1", operationId: OPERATION_ID }))

    expect(response.status).toBe(500)
    expect(releaseTransaction).toHaveBeenCalledTimes(1)
    expect(releaseFeatureWrite).toHaveBeenCalledTimes(1)
  })

  it("returns already_committed for a replayed operation", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    findOperationReceipt.mockResolvedValue({
      rowIndex: 4, operationId: OPERATION_ID, kind: "bill_payment", relatedId: "Pengeluaran!A2", committedAt: "2026-08-12T00:00:00.000Z",
    })
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "bill-1", operationId: OPERATION_ID }))

    expect(response.status).toBe(200)
    expect((await response.json()).status).toBe("already_committed")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})
