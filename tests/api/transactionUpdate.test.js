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
const AUTH = { user: { id: "u1" }, accessToken: "token-1", spreadsheetId: "sheet-1", tier: "paid" }

const EXPENSE_ROW = [
  "6 Agu 2026", "billpay:bill-1:2026-08-06", "Internet", "Internet/WiFi", 200000,
  5000, 2500, "BCA", 192500, "paid manually", "Agu", 2026, 2026, "event-1", "subscription", "Spesial",
  "1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c", "2026-08-06T01:00:00.000Z", "operational_expense", "Utang!A4",
]

async function writtenRow() {
  const { batchUpdateSheetValues } = await import("@/lib/sheets")
  const writes = batchUpdateSheetValues.mock.calls[0][2]
  return writes.find(entry => !entry.range.startsWith("_ArtamiOperations!"))
}

beforeEach(async () => {
  process.env.NEXTAUTH_SECRET = "test-secret"
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { batchUpdateSheetValues, ensureExpenseClassHeader, getSheetData } = await import("@/lib/sheets")
  const { claimRecordCreation, releaseRecordCreation } = await import("@/lib/recordQuota")
  const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
  const { claimFeatureWrite, releaseFeatureWrite } = await import("@/lib/writeClaims")
  const { ensureFinancialSchema } = await import("@/lib/financialSchema")
  const { findOperationReceipt } = await import("@/lib/financialOperations")

  getAuthContext.mockResolvedValue(AUTH)
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  batchUpdateSheetValues.mockResolvedValue({})
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue({ userId: "u1", period: "2026-08", current: 1 })
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
  getSheetData.mockResolvedValue([EXPENSE_ROW])
})

afterEach(() => {
  delete process.env.NEXTAUTH_SECRET
  vi.resetModules()
})

describe("transaction update route", () => {
  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/tx-1", {
      method: "PUT",
      body: JSON.stringify({ tab: "Pengeluaran", tanggal: "2026-08-06", kategori: "Internet/WiFi", jumlah: "250000", rowIndex: 2 }),
    }), { params: { id: "tx-1" } })

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("preserves the expense class, event tag, and movement metadata when updating", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/billpay:bill-1:2026-08-06", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        keterangan: "Internet diperbarui",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        akunBank: "BCA",
        rowIndex: 2,
      }),
    }), { params: { id: "billpay:bill-1:2026-08-06" } })

    expect(response.status).toBe(200)
    expect(getSheetData).toHaveBeenCalledWith("token-1", "Pengeluaran!A2:T2", "sheet-1")

    const write = await writtenRow()
    expect(write.range).toBe("Pengeluaran!A2:T2")
    expect(write.values[0]).toEqual([
      "6 Agu 2026", "billpay:bill-1:2026-08-06", "Internet diperbarui", "Internet/WiFi", 250000,
      5000, 2500, "BCA", 250000, "paid manually", "Agu", 2026, 2026, "event-1", "subscription", "Spesial",
      "1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c", "2026-08-06T01:00:00.000Z", "operational_expense", "Utang!A4",
    ])
  })

  it("replaces the existing expense class when sifat is provided", async () => {
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/billpay:bill-1:2026-08-06", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        keterangan: "Internet",
        kategori: "Internet/WiFi",
        jumlah: "200000",
        akunBank: "BCA",
        sifat: "Rutin",
        rowIndex: 2,
      }),
    }), { params: { id: "billpay:bill-1:2026-08-06" } })

    expect(response.status).toBe(200)
    const write = await writtenRow()
    expect(write.values[0]).toHaveLength(20)
    expect(write.values[0][15]).toBe("Rutin")
  })

  it("realigns the month and year columns when the date changes", async () => {
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/billpay:bill-1:2026-08-06", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-07-06",
        keterangan: "Internet",
        kategori: "Internet/WiFi",
        jumlah: "200000",
        rowIndex: 2,
      }),
    }), { params: { id: "billpay:bill-1:2026-08-06" } })

    expect(response.status).toBe(200)
    const write = await writtenRow()
    expect(write.values[0][0]).toBe("6 Jul 2026")
    expect(write.values[0][10]).toBe("Jul")
    expect(write.values[0][11]).toBe(2026)
  })

  it("preserves a savings allocation's goal and remaining amount", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([[
      "6 Agu 2026", "sv-1", "Setoran", "Tabungan Cash", 500000, "", "", "BCA", 500000, "",
      "Agu", 2026, 2026, "", "", "g1", "allocated", 400000, "2026-08-06T01:00:00.000Z", "savings_allocation", "",
    ]])
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/sv-1", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Tabungan",
        tanggal: "2026-08-06",
        keterangan: "Setoran diperbarui",
        kategori: "Tabungan Cash",
        jumlah: "450000",
        rowIndex: 2,
      }),
    }), { params: { id: "sv-1" } })

    expect(response.status).toBe(200)
    const write = await writtenRow()
    expect(write.range).toBe("Tabungan!A2:U2")
    expect(write.values[0][15]).toBe("g1")
    expect(write.values[0][16]).toBe("allocated")
    expect(write.values[0][17]).toBe(400000)
  })

  it("rejects an invalid expense class before reading or writing the row", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/tx-1", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        sifat: "TidakDikenal",
        rowIndex: 2,
      }),
    }), { params: { id: "tx-1" } })

    expect(response.status).toBe(400)
    expect(getSheetData).not.toHaveBeenCalled()
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it.each([
    ["an invalid calendar date", { tanggal: "2026-02-30" }],
    ["an invalid date format", { tanggal: "06-08-2026" }],
    ["a zero amount", { jumlah: "0" }],
    ["a negative amount", { jumlah: "-1" }],
    ["a non-finite amount", { jumlah: "not-a-number" }],
    ["an amount above the maximum", { jumlah: "1000000000000" }],
  ])("returns 400 before any Sheets write for %s", async (_label, overrides) => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/actual-id", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
        ...overrides,
      }),
    }), { params: { id: "actual-id" } })

    expect(response.status).toBe(400)
    expect(getSheetData).not.toHaveBeenCalled()
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("returns 404 without writing when the target row is missing", async () => {
    const { batchUpdateSheetValues, getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([])
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/tx-1", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "tx-1" } })

    expect(response.status).toBe(404)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("returns 404 without writing when the URL ID differs from the row ID", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([["6 Agu 2026", "actual-id", "Internet"]])
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/requested-id", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "requested-id" } })

    expect(response.status).toBe(404)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("accepts the deterministic dashboard fallback ID for a blank persisted ID", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([["6 Agu 2026", "", "Internet"]])
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/ex-1", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "ex-1" } })

    expect(response.status).toBe(200)
  })

  it("rejects a non-fallback URL ID when the persisted ID is blank", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([["6 Agu 2026", "", "Internet"]])
    const { PUT } = await import("@/app/api/transaction/[id]/route")

    const response = await PUT(new Request("http://localhost/api/transaction/wrong-id", {
      method: "PUT",
      body: JSON.stringify({
        operationId: OPERATION_ID,
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "wrong-id" } })

    expect(response.status).toBe(404)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})

describe("transaction delete route", () => {
  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { DELETE } = await import("@/app/api/transaction/[id]/route")

    const response = await DELETE(new Request("http://localhost/api/transaction/actual-id", {
      method: "DELETE",
      body: JSON.stringify({ tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "actual-id" } })

    expect(response.status).toBe(400)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("returns 404 without clearing when the DELETE URL ID differs from the row ID", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([["6 Agu 2026", "actual-id", "Internet"]])
    const { DELETE } = await import("@/app/api/transaction/[id]/route")

    const response = await DELETE(new Request("http://localhost/api/transaction/requested-id", {
      method: "DELETE",
      body: JSON.stringify({ operationId: OPERATION_ID, tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "requested-id" } })

    expect(response.status).toBe(404)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("clears the full row width and returns an undo token", async () => {
    const { ensureExpenseClassHeader, getSheetData } = await import("@/lib/sheets")
    const { DELETE } = await import("@/app/api/transaction/[id]/route")

    const response = await DELETE(new Request("http://localhost/api/transaction/billpay:bill-1:2026-08-06", {
      method: "DELETE",
      body: JSON.stringify({ operationId: OPERATION_ID, tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "billpay:bill-1:2026-08-06" } })

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.undoToken).toBeTruthy()
    expect(body.status).toBe("committed")
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token-1", "sheet-1")
    expect(getSheetData).toHaveBeenCalledWith("token-1", "Pengeluaran!A2:T2", "sheet-1")

    const write = await writtenRow()
    expect(write.range).toBe("Pengeluaran!A2:T2")
    expect(write.values[0]).toEqual(Array(20).fill(""))
  })

  it("clears the row when the DELETE URL ID matches its synthetic ID", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([["6 Agu 2026", "", "Internet"]])
    const { DELETE } = await import("@/app/api/transaction/[id]/route")

    const response = await DELETE(new Request("http://localhost/api/transaction/ex-1", {
      method: "DELETE",
      body: JSON.stringify({ operationId: OPERATION_ID, tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "ex-1" } })

    expect(response.status).toBe(200)
    expect(batchUpdateSheetValues).toHaveBeenCalledTimes(1)
  })

  it("returns 404 without writing when the DELETE row is missing", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([])
    const { DELETE } = await import("@/app/api/transaction/[id]/route")

    const response = await DELETE(new Request("http://localhost/api/transaction/ex-1", {
      method: "DELETE",
      body: JSON.stringify({ operationId: OPERATION_ID, tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "ex-1" } })

    expect(response.status).toBe(404)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})
