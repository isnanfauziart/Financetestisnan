import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  batchUpdateSheetValues: vi.fn(),
  ensureBillSourceHeader: vi.fn(),
  ensureExpenseClassHeader: vi.fn(),
  findNextEmptyRow: vi.fn(),
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
  updateSheetValues: vi.fn(),
}))
vi.mock("@/lib/recordQuota", () => ({
  claimRecordCreation: vi.fn(async () => "lock-1"),
  releaseRecordCreation: vi.fn(),
  runRecordCreation: vi.fn(async (_auth, _kind, _opts, fn) => fn()),
}))
vi.mock("@/lib/transactionQuota", () => ({
  reserveTransaction: vi.fn(async () => ({ userId: "u", period: "2026-08", current: 1 })),
  releaseTransaction: vi.fn(),
  quotaErrorResponse: vi.fn(error => Response.json({ error: error?.message || "quota" }, { status: 402 })),
}))
vi.mock("@/lib/writeClaims", () => ({
  claimFeatureWrite: vi.fn(async () => true),
  releaseFeatureWrite: vi.fn(),
}))
vi.mock("@/lib/financialSchema", async () => {
  const actual = await vi.importActual("@/lib/financialSchema")
  return { ...actual, ensureFinancialSchema: vi.fn(async () => ({ applied: false })) }
})
vi.mock("@/lib/financialOperations", async () => {
  const actual = await vi.importActual("@/lib/financialOperations")
  return { ...actual, findOperationReceipt: vi.fn(async () => null) }
})

const AUTH = { user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet-123", tier: "pro", entitlementVerified: true }
const SOURCE = "recurring:v1:netflix|hiburan|bank bca"

function billRow(fingerprint = "") {
  return ["b1", "Internet", 300000, "expense", "Internet", "Tagihan", "monthly", "7", "BCA", "TRUE", "", "", "2026-01-01", fingerprint || ""]
}

function post(body) {
  return new Request("http://localhost/api/bills/pay", { method: "POST", body: JSON.stringify(body) })
}

const OPERATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"

beforeEach(async () => {
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { ensureBillSourceHeader, ensureExpenseClassHeader, findNextEmptyRow, batchUpdateSheetValues } = await import("@/lib/sheets")
  getAuthContext.mockResolvedValue(AUTH)
  ensureBillSourceHeader.mockResolvedValue(undefined)
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 4 : 2))
  batchUpdateSheetValues.mockResolvedValue({})
})

afterEach(() => {
  vi.resetModules()
})

function expectBillWrite(batchUpdateSheetValues, expectedRange, expectedLength) {
  const writes = batchUpdateSheetValues.mock.calls[0][2]
  const billWrite = writes.find(entry => entry.range.startsWith("Tagihan!"))
  expect(billWrite.range).toBe(expectedRange)
  expect(billWrite.values[0]).toHaveLength(expectedLength)
  return billWrite
}

describe("bill payment preserves the source fingerprint", () => {
  it("rewrites a converted bill row to column N on payment", async () => {
    const { getSheetData, batchUpdateSheetValues, ensureBillSourceHeader } = await import("@/lib/sheets")
    getSheetData.mockImplementation(async (token, range) => {
      const target = String(range)
      if (target.startsWith("Tagihan")) return [["headers"], billRow(SOURCE)]
      if (target.startsWith("Settings!")) return []
      if (target.endsWith("!B:B")) return []
      return []
    })
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "b1", operationId: OPERATION_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(ensureBillSourceHeader).toHaveBeenCalledWith("token", "sheet-123")
    const billWrite = expectBillWrite(batchUpdateSheetValues, "Tagihan!A2:N2", 14)
    expect(billWrite.values[0][13]).toBe(SOURCE)
  })

  it("keeps a legacy bill row at 13 columns on payment", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getSheetData.mockImplementation(async (token, range) => {
      const target = String(range)
      if (target.startsWith("Tagihan")) return [["headers"], billRow("")]
      if (target.startsWith("Settings!")) return []
      if (target.endsWith("!B:B")) return []
      return []
    })
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(post({ billId: "b1", operationId: OPERATION_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expectBillWrite(batchUpdateSheetValues, "Tagihan!A2:M2", 13)
  })
})
