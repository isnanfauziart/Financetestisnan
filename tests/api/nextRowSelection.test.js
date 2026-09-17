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

const OPERATION_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
const AUTH = { user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet-123", tier: "paid", entitlementVerified: true }

function makeFilledColumn(lastRow) {
  return Array.from({ length: lastRow }, (_, i) => [i === 0 ? "Tanggal" : `row-${i + 1}`])
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
  findNextEmptyRow.mockResolvedValue(2)
  batchUpdateSheetValues.mockResolvedValue({})
  ensureExpenseClassHeader.mockResolvedValue(undefined)
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue({ userId: "u", period: "2026-07", current: 1 })
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
  getSheetData.mockResolvedValue([])
})

afterEach(() => {
  vi.resetModules()
})

describe("next row selection", () => {
  it("reserves the next empty row inside the serialized write lock", async () => {
    const { batchUpdateSheetValues, findNextEmptyRow } = await import("@/lib/sheets")
    const { claimRecordCreation } = await import("@/lib/recordQuota")
    findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 2 : 10000))
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ operationId: OPERATION_ID, tanggal: "2026-07-07", kategori: "Gaji", jumlah: "100000", type: "income" }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.rowIndex).toBe(10000)
    // Row selection only happens while the financial lock is held.
    expect(claimRecordCreation.mock.invocationCallOrder[0])
      .toBeLessThan(findNextEmptyRow.mock.invocationCallOrder[0])
    expect(batchUpdateSheetValues).toHaveBeenCalledWith(
      "token", "sheet-123",
      expect.arrayContaining([
        expect.objectContaining({ range: "Pemasukan!A10000:S10000" }),
        expect.objectContaining({ range: "_ArtamiOperations!A2:D2" }),
      ]),
      "RAW"
    )
  })

  it("writes bill payment transactions to row 10000 when row 9999 is already occupied", async () => {
    const { batchUpdateSheetValues, findNextEmptyRow, getSheetData } = await import("@/lib/sheets")
    findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 2 : 10000))
    getSheetData.mockImplementation(async (token, range) => {
      const target = String(range)
      if (target.startsWith("Tagihan!")) {
        return [
          ["ID", "Nama", "Jumlah", "Tipe", "KategoriBill", "KategoriTransaksi", "Frekuensi", "TanggalJatuhTempo", "AkunBank", "Aktif", "TerakhirDibayar", "Catatan", "CreatedAt"],
          ["bill-1", "Gaji Bulanan", "150000", "income", "Payroll", "Gaji", "monthly", "1", "BCA", "TRUE", "", "", "2026-07-07"],
        ]
      }
      if (target === "Pemasukan!A:A") return makeFilledColumn(9999)
      return []
    })
    const { POST } = await import("@/app/api/bills/pay/route")

    const response = await POST(new Request("http://localhost/api/bills/pay", {
      method: "POST",
      body: JSON.stringify({ billId: "bill-1", operationId: OPERATION_ID }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.transaction.row).toBe(10000)
    expect(batchUpdateSheetValues).toHaveBeenCalledWith(
      "token", "sheet-123",
      expect.arrayContaining([
        expect.objectContaining({ range: "Pemasukan!A10000:S10000" }),
        expect.objectContaining({ range: "Tagihan!A2:M2" }),
      ]),
      "USER_ENTERED"
    )
  })
})
