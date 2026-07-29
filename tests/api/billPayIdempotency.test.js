import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/sheets", () => ({
  getSheetData: vi.fn(),
  batchUpdateSheetValues: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
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

describe("bill payment idempotency", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("does not reserve or write a duplicate when the deterministic transaction already exists", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-07T08:00:00.000Z"))

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet-123", tier: "paid" })
    getSheetData
      .mockResolvedValueOnce([
        ["ID", "Nama", "Jumlah", "Tipe", "KategoriBill", "KategoriTransaksi", "Frekuensi", "TanggalJatuhTempo", "AkunBank", "Aktif", "TerakhirDibayar", "Catatan", "CreatedAt"],
        ["bill-1", "Internet", "300000", "expense", "Internet/WiFi", "Tagihan", "monthly", "7", "BCA", "TRUE", "2026-07-07", "", "2026-01-01"],
      ])
      .mockResolvedValueOnce([["ID"], ["billpay:bill-1:2026-07-07"]])

    const { POST } = await import("@/app/api/bills/pay/route")
    const req = new Request("http://localhost/api/bills/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billId: "bill-1" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.idempotent).toBe(true)
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { batchUpdateSheetValues } = await import("@/lib/sheets")
    expect(reserveTransaction).not.toHaveBeenCalled()
    expect(batchUpdateSheetValues).not.toHaveBeenCalled()
  })

  it("reconciles a stale bill row without reserving transaction quota", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-07T08:00:00.000Z"))
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet-123", tier: "free" })
    getSheetData
      .mockResolvedValueOnce([
        ["headers"],
        ["bill-1", "Internet", "300000", "expense", "Internet", "Tagihan", "monthly", "7", "BCA", "TRUE", "", "", "2026-01-01"],
      ])
      .mockResolvedValueOnce([["ID"], ["billpay:bill-1:2026-07-07"]])

    const { POST } = await import("@/app/api/bills/pay/route")
    const response = await POST(new Request("http://localhost/api/bills/pay", {
      method: "POST", body: JSON.stringify({ billId: "bill-1" }),
    }))
    expect(response.status).toBe(200)
    expect(batchUpdateSheetValues).toHaveBeenCalledTimes(1)
    expect(reserveTransaction).not.toHaveBeenCalled()
  })

  it("releases both quota and write claim when the batch fails", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, batchUpdateSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
    const { claimFeatureWrite, releaseFeatureWrite } = await import("@/lib/writeClaims")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet", tier: "free" })
    getSheetData
      .mockResolvedValueOnce([["headers"], ["b1", "Internet", 100, "expense", "Internet", "Tagihan", "monthly", "7", "BCA", "TRUE", "", "", "2026-01-01"]])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([["Tanggal"]])
    claimFeatureWrite.mockResolvedValue(true)
    reserveTransaction.mockResolvedValue({ userId: "u", period: "2026-07", current: 1 })
    batchUpdateSheetValues.mockRejectedValue(new Error("Sheets down"))

    const { POST } = await import("@/app/api/bills/pay/route")
    const response = await POST(new Request("http://localhost/api/bills/pay", {
      method: "POST", body: JSON.stringify({ billId: "b1" }),
    }))
    expect(response.status).toBe(500)
    expect(releaseTransaction).toHaveBeenCalledTimes(1)
    expect(releaseFeatureWrite).toHaveBeenCalledTimes(1)
  })
})
