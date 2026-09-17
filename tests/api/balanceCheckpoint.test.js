import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
// Keep the real `parseRupiah` so the balance parser is exercised as shipped.
vi.mock("@/lib/sheets", async () => {
  const actual = await vi.importActual("@/lib/sheets")
  return {
    ...actual,
    appendSheetValues: vi.fn(),
    batchUpdateSheetValues: vi.fn(),
    ensureExpenseClassHeader: vi.fn(),
    findNextEmptyRow: vi.fn(),
    getSheetData: vi.fn(),
    updateSheetValues: vi.fn(),
  }
})
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
const AUTH = { user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet", tier: "free", entitlementVerified: true }
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function post(body) {
  return new Request("http://localhost/api/balance-checkpoint", { method: "POST", body: JSON.stringify(body) })
}

async function writtenData() {
  const { batchUpdateSheetValues } = await import("@/lib/sheets")
  return batchUpdateSheetValues.mock.calls[0][2]
}

beforeEach(async () => {
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { batchUpdateSheetValues, findNextEmptyRow, getSheetData } = await import("@/lib/sheets")
  const { claimRecordCreation, releaseRecordCreation } = await import("@/lib/recordQuota")
  const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
  const { claimFeatureWrite, releaseFeatureWrite } = await import("@/lib/writeClaims")
  const { ensureFinancialSchema } = await import("@/lib/financialSchema")
  const { findOperationReceipt } = await import("@/lib/financialOperations")

  getAuthContext.mockResolvedValue(AUTH)
  batchUpdateSheetValues.mockResolvedValue({})
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "Settings" ? 4 : 2))
  getSheetData.mockResolvedValue([["startingBalance", "1000000"], ["startingBalanceDate", "2026-01-01"]])
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue(null)
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
})

afterEach(() => {
  vi.resetModules()
})

describe("balance checkpoint", () => {
  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/balance-checkpoint/route")

    const response = await POST(post({ amount: 2500000 }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it.each([
    ["a negative amount", -1],
    ["a blank amount", ""],
    ["a non-numeric amount", "banyak"],
  ])("rejects %s", async (_label, amount) => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/balance-checkpoint/route")

    const response = await POST(post({ operationId: OPERATION_ID, amount }))

    expect(response.status).toBe(400)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("saves a confirmed Rp0 balance with a fresh checkpoint id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/balance-checkpoint/route")

    const response = await POST(post({ operationId: OPERATION_ID, amount: 0 }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ success: true, operationId: OPERATION_ID, status: "committed", balance: 0, provisional: false })
    expect(body.checkpointId).toMatch(UUID_PATTERN)

    const data = await writtenData()
    const checkpointWrite = data.find(entry => entry.values[0][0] === "currentCashBalance")
    expect(checkpointWrite.values[0][1]).toBe("0")
    const idWrite = data.find(entry => entry.values[0][0] === "currentCashBalanceCheckpointId")
    expect(idWrite.values[0][1]).toBe(body.checkpointId)
    expect(data.find(entry => entry.values[0][0] === "currentCashBalanceRecordedAt").values[0][1]).toBeTruthy()
    expect(data.find(entry => entry.range.startsWith("_ArtamiOperations!"))).toBeTruthy()
    expect(batchUpdateSheetValues).toHaveBeenCalledTimes(1)
  })

  it("rotates the checkpoint id on every save", async () => {
    const { POST } = await import("@/app/api/balance-checkpoint/route")

    const first = await (await POST(post({ operationId: OPERATION_ID, amount: 1000 }))).json()
    const second = await (await POST(post({
      operationId: "99999999-8888-4777-8666-555555555555",
      amount: 2000,
    }))).json()

    expect(first.checkpointId).not.toBe(second.checkpointId)
  })

  it("updates existing settings rows in place", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([
      ["startingBalance", "1000000"],
      ["currentCashBalance", "500000"],
      ["currentCashBalanceCheckpointId", "11111111-2222-4333-8444-555555555555"],
    ])
    const { POST } = await import("@/app/api/balance-checkpoint/route")

    await POST(post({ operationId: OPERATION_ID, amount: 750000 }))

    const data = await writtenData()
    expect(data.find(entry => entry.values[0][0] === "currentCashBalance").range).toBe("Settings!A2:B2")
    // Only the missing recorded-at key is appended.
    expect(data.find(entry => entry.values[0][0] === "currentCashBalanceRecordedAt").range).toBe("Settings!A4:B4")
  })

  it("never consumes transaction quota", async () => {
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { POST } = await import("@/app/api/balance-checkpoint/route")

    await POST(post({ operationId: OPERATION_ID, amount: 1000 }))

    expect(reserveTransaction).not.toHaveBeenCalled()
  })

  it("returns already_committed for a replay", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    findOperationReceipt.mockResolvedValue({
      rowIndex: 2, operationId: OPERATION_ID, kind: "balance_checkpoint", relatedId: "abc", committedAt: "2026-08-12T00:00:00.000Z",
    })
    const { POST } = await import("@/app/api/balance-checkpoint/route")

    const response = await POST(post({ operationId: OPERATION_ID, amount: 1000 }))

    expect((await response.json()).status).toBe("already_committed")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})
