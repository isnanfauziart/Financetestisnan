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
  quotaErrorResponse: vi.fn(() => Response.json({ error: "quota" }, { status: 403 })),
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
const RESERVATION = { userId: "u", period: "2026-07", current: 1 }

function post(body) {
  return new Request("http://localhost/api/transaction", { method: "POST", body: JSON.stringify(body) })
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

  getAuthContext.mockResolvedValue({ user: { id: "u" }, tier: "free", entitlementVerified: true, accessToken: "t", spreadsheetId: "s" })
  getSheetData.mockResolvedValue([])
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  findNextEmptyRow.mockResolvedValue(2)
  batchUpdateSheetValues.mockResolvedValue({})
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue(RESERVATION)
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
})

afterEach(() => {
  vi.resetModules()
})

describe("manual transaction quota flow", () => {
  it("validates calendar dates before reserving quota", async () => {
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ operationId: OPERATION_ID, tanggal: "2026-02-30", kategori: "Makan", jumlah: 1 }))

    expect(response.status).toBe(400)
    expect(reserveTransaction).not.toHaveBeenCalled()
  })

  it("reserves quota before the row is written", async () => {
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ operationId: OPERATION_ID, tanggal: "2026-07-28", kategori: "Makan", jumlah: 1 }))

    expect(response.status).toBe(200)
    expect(reserveTransaction).toHaveBeenCalled()
    expect(reserveTransaction.mock.invocationCallOrder[0])
      .toBeLessThan(batchUpdateSheetValues.mock.invocationCallOrder[0])
  })

  it("releases a reservation when the write fails with no receipt", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { releaseTransaction } = await import("@/lib/transactionQuota")
    batchUpdateSheetValues.mockRejectedValue(new Error("Sheets down"))
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ operationId: OPERATION_ID, tanggal: "2026-07-28", kategori: "Makan", jumlah: 1 }))

    expect(response.status).toBe(500)
    expect(releaseTransaction).toHaveBeenCalledWith(RESERVATION)
  })

  it("keeps the reservation when the outcome cannot be established", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { releaseTransaction } = await import("@/lib/transactionQuota")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    batchUpdateSheetValues.mockRejectedValue(new Error("timeout"))
    findOperationReceipt.mockRejectedValue(new Error("Sheets unavailable"))
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ operationId: OPERATION_ID, tanggal: "2026-07-28", kategori: "Makan", jumlah: 1 }))

    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe("OPERATION_UNRESOLVED")
    expect(releaseTransaction).not.toHaveBeenCalled()
  })
})
