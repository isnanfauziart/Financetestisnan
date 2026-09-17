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
  runRecordCreation: vi.fn(async (auth, feature, options, create) => create(null)),
  runRecordCreations: vi.fn(),
  recordQuotaResponse: vi.fn(() => Response.json({ error: "limit" }, { status: 403 })),
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

function userA(id = "user-a", sheetId = "sheet-a") {
  return { user: { id }, accessToken: `token-${id}`, spreadsheetId: sheetId, tier: "paid", entitlementVerified: true }
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

  getAuthContext.mockResolvedValue(userA())
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 2 : 2))
  batchUpdateSheetValues.mockResolvedValue({})
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue({ userId: "user-a", period: "2026-08", current: 1 })
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
  getSheetData.mockImplementation(async (token, range) => {
    const target = String(range)
    if (target.startsWith("Tagihan!")) {
      return [["headers"], ["bill-1", "Internet", 300000, "expense", "Internet", "Tagihan", "monthly", "7", "BCA", "TRUE", "", "", "2026-01-01"]]
    }
    if (target.startsWith("Utang!")) return [["ID"], ["d1", "Ari", 100, "utang", "2026-08-01", "open", 100, "", "2026-07-01"]]
    if (target.startsWith("Pengeluaran!A")) return [["6 Agu 2026", "expense-1", "Internet"]]
    return []
  })
})

afterEach(() => {
  vi.resetModules()
})

describe("money-moving route authentication", () => {
  it("rejects an unauthenticated transaction create", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(null)
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }),
    }))

    expect(response.status).toBe(401)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects an unauthenticated bill payment", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue(null)
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(new Request("http://localhost/api/bills/pay", {
      method: "POST",
      body: JSON.stringify({ billId: "bill-1", operationId: OPERATION_ID }),
    }))

    expect(response.status).toBe(401)
  })

  it("rejects an unauthenticated debt action", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue(null)
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(new Request("http://localhost/api/debts", {
      method: "POST",
      body: JSON.stringify({ action: "pay", id: "d1", amount: 10, paymentId: "p1", operationId: OPERATION_ID }),
    }))

    expect(response.status).toBe(401)
  })

  it("rejects an unauthenticated transaction edit and delete", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue(null)
    const { PUT, DELETE } = await import("@/app/api/transaction/[id]/route")

    const edited = await PUT(new Request("http://localhost/api/transaction/expense-1", {
      method: "PUT",
      body: JSON.stringify({ operationId: OPERATION_ID, tab: "Pengeluaran", tanggal: "2026-08-06", kategori: "Internet/WiFi", jumlah: "1000", rowIndex: 2 }),
    }), { params: { id: "expense-1" } })
    const deleted = await DELETE(new Request("http://localhost/api/transaction/expense-1", {
      method: "DELETE",
      body: JSON.stringify({ operationId: OPERATION_ID, tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "expense-1" } })

    expect(edited.status).toBe(401)
    expect(deleted.status).toBe(401)
  })
})

describe("cross-user sheet isolation", () => {
  it("writes a transaction only into the authenticated user's spreadsheet", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/transaction/route")

    getAuthContext.mockResolvedValue(userA("user-a", "sheet-a"))
    await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }),
    }))
    expect(batchUpdateSheetValues.mock.calls[0][1]).toBe("sheet-a")
    expect(batchUpdateSheetValues.mock.calls[0][0]).toBe("token-user-a")

    batchUpdateSheetValues.mockClear()
    getAuthContext.mockResolvedValue(userA("user-b", "sheet-b"))
    await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }),
    }))
    expect(batchUpdateSheetValues.mock.calls[0][1]).toBe("sheet-b")
    expect(batchUpdateSheetValues.mock.calls[0][0]).toBe("token-user-b")
  })

  it("writes a bill payment and a debt action only into the authenticated user's spreadsheet", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST: payBill } = await import("@/app/api/bills/pay/route")
    const { POST: postDebt } = await import("@/app/api/debts/route")

    await payBill(new Request("http://localhost/api/bills/pay", {
      method: "POST",
      body: JSON.stringify({ billId: "bill-1", operationId: OPERATION_ID }),
    }))
    expect(batchUpdateSheetValues.mock.calls.at(-1)[1]).toBe("sheet-a")

    batchUpdateSheetValues.mockClear()
    await postDebt(new Request("http://localhost/api/debts", {
      method: "POST",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        namaOrang: "Budi",
        jumlah: 500000,
        arah: "utang",
        jatuhTempo: "2026-09-01",
        entryMode: "new",
        akunBank: "Bank BCA",
      }),
    }))
    expect(batchUpdateSheetValues.mock.calls[0][1]).toBe("sheet-a")
    expect(batchUpdateSheetValues.mock.calls[0][0]).toBe("token-user-a")
  })

  it("reads the receipt ledger from the authenticated user's spreadsheet", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    const { POST } = await import("@/app/api/transaction/route")

    findOperationReceipt.mockResolvedValue(null)
    getAuthContext.mockResolvedValue(userA("user-b", "sheet-b"))

    await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }),
    }))

    expect(findOperationReceipt).toHaveBeenCalledWith("token-user-b", "sheet-b", OPERATION_ID)
    expect(getSheetData.mock.calls.every(([token]) => token === "token-user-b")).toBe(true)
  })
})
