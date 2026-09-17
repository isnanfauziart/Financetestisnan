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
const AUTH = { user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet", tier: "paid", entitlementVerified: true }

const DEBT_ROW = ["d1", "Ari", 100, "utang", "2026-08-01", "open", 100, "", "2026-07-01"]

function post(body) {
  return new Request("http://localhost/api/debts", { method: "POST", body: JSON.stringify(body) })
}

function mockSheets({ debtRows = [DEBT_ROW], existingTxIds = null } = {}) {
  return async (token, range) => {
    const target = String(range)
    if (target.startsWith("Utang!")) return [["ID"], ...debtRows]
    if (target.startsWith("Settings!")) return []
    if (target.endsWith("!B:B")) return existingTxIds ? [["ID"], ...existingTxIds.map(id => [id])] : []
    return []
  }
}

async function writes() {
  const { batchUpdateSheetValues } = await import("@/lib/sheets")
  return batchUpdateSheetValues.mock.calls[0]?.[2] || []
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
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 3 : 2))
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
})

describe("debt payment", () => {
  it("records a piutang receipt as income in the same batch", async () => {
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getSheetData.mockImplementation(mockSheets({ debtRows: [["d1", "Ari", 100, "piutang", "2026-08-01", "open", 100, "", "2026-07-01"]] }))
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({ action: "pay", id: "d1", amount: 40, paymentId: "stable-1", operationId: OPERATION_ID }))

    expect(response.status).toBe(200)
    const written = await writes()
    const transactionWrite = written.find(item => item.range.startsWith("Pemasukan!"))
    expect(transactionWrite.range).toBe("Pemasukan!A2:S2")
    expect(transactionWrite.values[0][3]).toBe("Piutang")
    expect(transactionWrite.values[0][17]).toBe("receivable_principal_in")
    expect(written.find(item => item.range.startsWith("_ArtamiOperations!")).values[0][1]).toBe("debt_payment")
    expect(batchUpdateSheetValues).toHaveBeenCalledTimes(1)
  })

  it("records an utang payment with the Utang category and routine class", async () => {
    const { getSheetData, batchUpdateSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    getSheetData.mockImplementation(mockSheets())
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({ action: "pay", id: "d1", amount: 40, paymentId: "stable-utang", operationId: OPERATION_ID }))

    expect(response.status).toBe(200)
    const written = await writes()
    const transactionWrite = written.find(item => item.range.startsWith("Pengeluaran!"))
    expect(transactionWrite.range).toBe("Pengeluaran!A2:T2")
    expect(transactionWrite.values[0][3]).toBe("Utang")
    expect(transactionWrite.values[0]).toHaveLength(20)
    expect(transactionWrite.values[0][15]).toBe("Rutin")
    expect(transactionWrite.values[0][18]).toBe("debt_principal_out")
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token", "sheet")
    expect(batchUpdateSheetValues).toHaveBeenCalledTimes(1)
  })

  it("records the affected account when it is supplied", async () => {
    const { POST } = await import("@/app/api/debts/route")

    await POST(post({ action: "pay", id: "d1", amount: 40, paymentId: "stable-account", akunBank: "Bank BCA", operationId: OPERATION_ID }))

    const written = await writes()
    expect(written.find(item => item.range.startsWith("Pengeluaran!")).values[0][7]).toBe("Bank BCA")
    expect(written.find(item => item.range.startsWith("Utang!")).values[0][10]).toBe("Bank BCA")
  })

  it("treats a stable payment id as idempotent before reserving quota", async () => {
    const { batchUpdateSheetValues, getSheetData } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    getSheetData.mockImplementation(mockSheets({ existingTxIds: ["debtpay:d1:stable-1"] }))
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({ action: "pay", id: "d1", amount: 40, paymentId: "stable-1", operationId: OPERATION_ID }))

    expect(response.status).toBe(200)
    expect((await response.json()).idempotent).toBe(true)
    expect(reserveTransaction).not.toHaveBeenCalled()
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects a payment on a settled debt without writing", async () => {
    const { batchUpdateSheetValues, getSheetData } = await import("@/lib/sheets")
    getSheetData.mockImplementation(mockSheets({ debtRows: [["d1", "Ari", 100, "utang", "2026-08-01", "settled", 0, "", "2026-07-01"]] }))
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({ action: "pay", id: "d1", amount: 40, paymentId: "stable-settled", operationId: OPERATION_ID }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("DEBT_SETTLED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("releases both quota and the claim when the batch fails", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { releaseTransaction } = await import("@/lib/transactionQuota")
    const { releaseFeatureWrite } = await import("@/lib/writeClaims")
    batchUpdateSheetValues.mockRejectedValue(new Error("Sheets down"))
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({ action: "pay", id: "d1", amount: 40, paymentId: "stable-2", operationId: OPERATION_ID }))

    expect(response.status).toBe(500)
    expect(releaseTransaction).toHaveBeenCalledTimes(1)
    expect(releaseFeatureWrite).toHaveBeenCalledTimes(1)
  })

  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({ action: "pay", id: "d1", amount: 40, paymentId: "stable-3" }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})

describe("debt creation entry modes", () => {
  it("defaults to the historical mode and writes no cash movement", async () => {
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      namaOrang: "Budi",
      jumlah: 500000,
      arah: "utang",
      jatuhTempo: "2026-09-01",
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ success: true, status: "committed", entryMode: "historical" })

    const written = await writes()
    expect(written).toHaveLength(2)
    const debtWrite = written.find(item => item.range.startsWith("Utang!"))
    expect(debtWrite.range).toBe("Utang!A2:M2")
    expect(debtWrite.values[0][9]).toBe("historical")
    expect(debtWrite.values[0][12]).toBe(OPERATION_ID)
    expect(written.some(item => item.range.startsWith("Pemasukan!") || item.range.startsWith("Pengeluaran!"))).toBe(false)
    expect(reserveTransaction).not.toHaveBeenCalled()
  })

  it("records a new Utang with its principal cash movement", async () => {
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      namaOrang: "Budi",
      jumlah: 500000,
      arah: "utang",
      jatuhTempo: "2026-09-01",
      entryMode: "new",
      akunBank: "Bank BCA",
    }))

    expect(response.status).toBe(200)
    const written = await writes()
    const principal = written.find(item => item.range.startsWith("Pemasukan!"))
    expect(principal.values[0][3]).toBe("Utang")
    expect(principal.values[0][17]).toBe("debt_principal_in")
    expect(principal.values[0][7]).toBe("Bank BCA")
    expect(written.find(item => item.range.startsWith("Utang!")).values[0][9]).toBe("new")
  })

  it("records a new Piutang as cash out with principal metadata", async () => {
    const { ensureExpenseClassHeader } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      namaOrang: "Ari",
      jumlah: 250000,
      arah: "piutang",
      jatuhTempo: "2026-09-01",
      entryMode: "new",
      akunBank: "Bank BCA",
    }))

    expect(response.status).toBe(200)
    const written = await writes()
    const principal = written.find(item => item.range.startsWith("Pengeluaran!"))
    expect(principal.values[0][3]).toBe("Piutang")
    expect(principal.values[0][18]).toBe("receivable_principal_out")
    expect(principal.values[0][15]).toBe("Rutin")
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token", "sheet")
  })

  it("requires an account for the new mode", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      namaOrang: "Budi",
      jumlah: 500000,
      arah: "utang",
      jatuhTempo: "2026-09-01",
      entryMode: "new",
    }))

    expect(response.status).toBe(400)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects an unknown entry mode", async () => {
    const { POST } = await import("@/app/api/debts/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      namaOrang: "Budi",
      jumlah: 500000,
      arah: "utang",
      jatuhTempo: "2026-09-01",
      entryMode: "guessed",
    }))

    expect(response.status).toBe(400)
  })

  it("reads a legacy row as the historical mode", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockImplementation(mockSheets({ debtRows: [["d9", "Lama", 100, "utang", "2026-08-01", "open", 100, "", "2026-07-01", "", "", "", ""]] }))
    const { GET } = await import("@/app/api/debts/route")

    const response = await GET(new Request("http://localhost/api/debts"))
    const body = await response.json()

    expect(body.debts[0]).toMatchObject({ entryMode: "historical", akunBank: "" })
  })
})
