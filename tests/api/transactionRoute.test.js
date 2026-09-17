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

function post(body) {
  return new Request("http://localhost/api/transaction", { method: "POST", body: JSON.stringify(body) })
}

async function lastWrite() {
  const { batchUpdateSheetValues } = await import("@/lib/sheets")
  const writes = batchUpdateSheetValues.mock.calls[0][2]
  return {
    calls: batchUpdateSheetValues.mock.calls,
    mutation: writes.find(entry => !entry.range.startsWith("_ArtamiOperations!")),
    receipt: writes.find(entry => entry.range.startsWith("_ArtamiOperations!")),
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
  findNextEmptyRow.mockImplementation(async (token, sheetName) => (sheetName === "_ArtamiOperations" ? 2 : 5))
  batchUpdateSheetValues.mockResolvedValue({})
  claimRecordCreation.mockResolvedValue("lock-1")
  releaseRecordCreation.mockResolvedValue(undefined)
  reserveTransaction.mockResolvedValue({ userId: "u1", period: "2026-08", current: 1 })
  releaseTransaction.mockResolvedValue(undefined)
  claimFeatureWrite.mockResolvedValue(true)
  releaseFeatureWrite.mockResolvedValue(true)
  ensureFinancialSchema.mockResolvedValue({ applied: false })
  findOperationReceipt.mockResolvedValue(null)
  getSheetData.mockImplementation(async (token, range) => {
    if (String(range).startsWith("Settings!")) return [["startingBalance", "0"]]
    if (String(range).startsWith("Goals!")) return [["ID"], ["g1"]]
    return []
  })
})

afterEach(() => {
  vi.resetModules()
})

describe("transaction create route", () => {
  it("requires an operation id", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("persists an omitted expense class as Rutin and stamps movement metadata", async () => {
    const { ensureExpenseClassHeader } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      tanggal: "2026-08-08",
      kategori: "Makan",
      jumlah: 10000,
    }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ success: true, operationId: OPERATION_ID, status: "committed", rowIndex: 5 })

    const { mutation, receipt } = await lastWrite()
    expect(mutation.range).toBe("Pengeluaran!A5:T5")
    expect(mutation.values[0]).toHaveLength(20)
    expect(mutation.values[0][15]).toBe("Rutin")
    expect(mutation.values[0][18]).toBe("operational_expense")
    expect(receipt.range).toBe("_ArtamiOperations!A2:D2")
    expect(receipt.values[0][0]).toBe(OPERATION_ID)
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token-1", "sheet-1")
  })

  it("persists an explicit Spesial expense class", async () => {
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      tanggal: "2026-08-08",
      kategori: "Kondangan",
      jumlah: 100000,
      sifat: "Spesial",
    }))

    expect(response.status).toBe(200)
    const { mutation } = await lastWrite()
    expect(mutation.values[0][15]).toBe("Spesial")
  })

  it("stamps the active checkpoint on cash rows only", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockImplementation(async (token, range) => {
      if (String(range).startsWith("Settings!")) {
        return [
          ["currentCashBalance", "2500000"],
          ["currentCashBalanceCheckpointId", "1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c"],
          ["currentCashBalanceRecordedAt", "2026-08-01T02:00:00.000Z"],
        ]
      }
      return []
    })
    const { POST } = await import("@/app/api/transaction/route")

    await POST(post({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Gaji", jumlah: 500000, type: "income" }))

    const { mutation } = await lastWrite()
    expect(mutation.range).toBe("Pemasukan!A5:S5")
    expect(mutation.values[0][15]).toBe("1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c")
    expect(mutation.values[0][17]).toBe("operational_income")
  })

  it("leaves the checkpoint blank before a balance has been saved", async () => {
    const { POST } = await import("@/app/api/transaction/route")

    await POST(post({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Gaji", jumlah: 500000, type: "income" }))

    const { mutation } = await lastWrite()
    expect(mutation.values[0][15]).toBe("")
  })

  it("requires an explicit goal for a new savings contribution", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      tanggal: "2026-08-08",
      kategori: "Tabungan Cash",
      jumlah: 500000,
      type: "savings",
    }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("GOAL_REQUIRED")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("rejects a savings contribution for a goal that does not exist", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      tanggal: "2026-08-08",
      kategori: "Tabungan Cash",
      jumlah: 500000,
      type: "savings",
      goalId: "deleted-goal",
    }))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("GOAL_NOT_FOUND")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("writes a savings allocation with its goal and remaining amount", async () => {
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      tanggal: "2026-08-08",
      kategori: "Tabungan Cash",
      jumlah: 500000,
      type: "savings",
      goalId: "g1",
    }))

    expect(response.status).toBe(200)
    const { mutation } = await lastWrite()
    expect(mutation.range).toBe("Tabungan!A5:U5")
    expect(mutation.values[0][15]).toBe("g1")
    expect(mutation.values[0][16]).toBe("allocated")
    expect(mutation.values[0][17]).toBe(500000)
    expect(mutation.values[0][19]).toBe("savings_allocation")
    expect(mutation.values[0][8]).toBe(500000)
  })

  it("returns already_committed without writing for a replayed operation", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { findOperationReceipt } = await import("@/lib/financialOperations")
    findOperationReceipt.mockResolvedValue({
      rowIndex: 2, operationId: OPERATION_ID, kind: "transaction_create", relatedId: "", committedAt: "2026-08-08T00:00:00.000Z",
    })
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }))

    expect(response.status).toBe(200)
    expect((await response.json()).status).toBe("already_committed")
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(reserveTransaction).not.toHaveBeenCalled()
  })

  it("rejects an invalid non-empty expense class before any write", async () => {
    const { batchUpdateSheetValues, ensureExpenseClassHeader, findNextEmptyRow } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({
      operationId: OPERATION_ID,
      tanggal: "2026-08-08",
      kategori: "Makan",
      jumlah: 10000,
      sifat: "TidakDikenal",
    }))

    expect(response.status).toBe(400)
    expect(ensureExpenseClassHeader).not.toHaveBeenCalled()
    expect(findNextEmptyRow).not.toHaveBeenCalled()
    expect(reserveTransaction).not.toHaveBeenCalled()
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("releases the reservation when the expense header migration fails", async () => {
    const { batchUpdateSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    const { releaseTransaction } = await import("@/lib/transactionQuota")
    ensureExpenseClassHeader.mockRejectedValue(new Error("Kolom Sifat tidak dapat dimigrasikan"))
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }))

    expect(response.status).toBe(500)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
    expect(releaseTransaction).toHaveBeenCalled()
  })

  it("never writes when quota is exhausted", async () => {
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    reserveTransaction.mockRejectedValue(Object.assign(new Error("FEATURE_LIMIT_REACHED"), { code: "FEATURE_LIMIT_REACHED" }))
    const { POST } = await import("@/app/api/transaction/route")

    const response = await POST(post({ operationId: OPERATION_ID, tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }))

    expect(response.status).toBe(403)
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })
})
