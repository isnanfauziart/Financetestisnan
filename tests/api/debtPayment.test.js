import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/sheets", () => ({
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
  batchUpdateSheetValues: vi.fn(),
  ensureExpenseClassHeader: vi.fn(),
}))
vi.mock("@/lib/transactionQuota", () => ({
  reserveTransaction: vi.fn(),
  releaseTransaction: vi.fn(),
  quotaErrorResponse: vi.fn(),
}))
vi.mock("@/lib/writeClaims", () => ({
  claimFeatureWrite: vi.fn(() => true),
  releaseFeatureWrite: vi.fn(),
}))

describe("debt payment", () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it("records a piutang receipt as income in the same batch", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet", tier: "paid" })
    getSheetData
      .mockResolvedValueOnce([
        ["ID", "Nama", "Jumlah", "Arah", "JatuhTempo", "Status", "Sisa", "Catatan", "Created"],
        ["d1", "Ari", 100, "piutang", "2026-08-01", "open", 100, "", "2026-07-01"],
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([["Tanggal"]])

    const { POST } = await import("@/app/api/debts/route")
    const response = await POST(new Request("http://localhost/api/debts", {
      method: "POST",
      body: JSON.stringify({ action: "pay", id: "d1", amount: 40, paymentId: "stable-1" }),
    }))

    expect(response.status).toBe(200)
    expect(batchUpdateSheetValues).toHaveBeenCalledWith(
      "token", "sheet",
      expect.arrayContaining([expect.objectContaining({ range: "Pemasukan!A2:O2" })])
    )
    const writes = batchUpdateSheetValues.mock.calls[0][2]
    expect(writes.find(item => item.range === "Pemasukan!A2:O2").values[0][3]).toBe("Piutang")
  })

  it("records an utang payment with the Utang category", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, batchUpdateSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet", tier: "paid" })
    ensureExpenseClassHeader.mockResolvedValue(undefined)
    getSheetData
      .mockResolvedValueOnce([["headers"], ["d1", "Ari", 100, "utang", "2026-08-01", "open", 100, "", "2026-07-01"]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([["Tanggal"]])

    const { POST } = await import("@/app/api/debts/route")
    const response = await POST(new Request("http://localhost/api/debts", {
      method: "POST",
      body: JSON.stringify({ action: "pay", id: "d1", amount: 40, paymentId: "stable-utang" }),
    }))

    expect(response.status).toBe(200)
    const writes = batchUpdateSheetValues.mock.calls[0][2]
    expect(writes).toEqual(expect.arrayContaining([
      expect.objectContaining({ range: "Pengeluaran!A2:P2", values: [expect.any(Array)] }),
    ]))
    const transactionWrite = writes.find(item => item.range === "Pengeluaran!A2:P2")
    expect(transactionWrite.values[0][3]).toBe("Utang")
    expect(transactionWrite.values[0]).toHaveLength(16)
    expect(transactionWrite.values[0][15]).toBe("Rutin")
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token", "sheet")
  })

  it("treats a stable payment id as idempotent before reserving quota", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet", tier: "free" })
    getSheetData
      .mockResolvedValueOnce([
        ["headers"],
        ["d1", "Ari", 100, "utang", "2026-08-01", "open", 60, "", "2026-07-01"],
      ])
      .mockResolvedValueOnce([["ID"], ["debtpay:d1:stable-1"]])

    const { POST } = await import("@/app/api/debts/route")
    const response = await POST(new Request("http://localhost/api/debts", {
      method: "POST",
      body: JSON.stringify({ action: "pay", id: "d1", amount: 40, paymentId: "stable-1" }),
    }))

    expect(response.status).toBe(200)
    expect(reserveTransaction).not.toHaveBeenCalled()
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("releases both quota and deterministic claim when the batch fails", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
    const { claimFeatureWrite, releaseFeatureWrite } = await import("@/lib/writeClaims")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet", tier: "free" })
    getSheetData
      .mockResolvedValueOnce([["headers"], ["d1", "Ari", 100, "utang", "2026-08-01", "open", 100, "", "2026-07-01"]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([["Tanggal"]])
    claimFeatureWrite.mockResolvedValue(true)
    reserveTransaction.mockResolvedValue({ userId: "u", period: "2026-07", current: 1 })
    batchUpdateSheetValues.mockRejectedValue(new Error("Sheets down"))

    const { POST } = await import("@/app/api/debts/route")
    const response = await POST(new Request("http://localhost/api/debts", {
      method: "POST",
      body: JSON.stringify({ action: "pay", id: "d1", amount: 40, paymentId: "stable-2" }),
    }))
    expect(response.status).toBe(500)
    expect(releaseTransaction).toHaveBeenCalledTimes(1)
    expect(releaseFeatureWrite).toHaveBeenCalledTimes(1)
  })
})
