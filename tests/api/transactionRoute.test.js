import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  appendSheetValues: vi.fn(),
  ensureExpenseClassHeader: vi.fn(),
  getSheetData: vi.fn(),
  updateSheetValues: vi.fn(),
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

describe("transaction create route", () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("persists an omitted expense class as Rutin in Pengeluaran A:P", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const auth = { user: { id: "u1" }, accessToken: "token-1", spreadsheetId: "sheet-1", tier: "paid" }
    getAuthContext.mockResolvedValue(auth)
    ensureExpenseClassHeader.mockResolvedValue(undefined)
    reserveTransaction.mockResolvedValue({ userId: "u1", period: "2026-08", current: 1 })
    appendSheetValues.mockResolvedValue({ updates: { updatedRange: "Pengeluaran!A2:P2" } })

    const { POST } = await import("@/app/api/transaction/route")
    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }),
    }))

    expect(response.status).toBe(200)
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token-1", "sheet-1")
    expect(appendSheetValues).toHaveBeenCalledWith(
      "token-1", "Pengeluaran!A:P", [expect.any(Array)], "sheet-1", "RAW"
    )
    expect(appendSheetValues.mock.calls[0][2][0]).toHaveLength(16)
    expect(appendSheetValues.mock.calls[0][2][0][15]).toBe("Rutin")
  })

  it("persists an explicit Spesial expense class in Pengeluaran A:P", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    const auth = { user: { id: "u1" }, accessToken: "token-1", spreadsheetId: "sheet-1", tier: "paid" }
    getAuthContext.mockResolvedValue(auth)
    ensureExpenseClassHeader.mockResolvedValue(undefined)

    const { POST } = await import("@/app/api/transaction/route")
    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ tanggal: "2026-08-08", kategori: "Kondangan", jumlah: 100000, sifat: "Spesial" }),
    }))

    expect(response.status).toBe(200)
    expect(appendSheetValues).toHaveBeenCalledWith(
      "token-1", "Pengeluaran!A:P", [expect.any(Array)], "sheet-1", "RAW"
    )
    expect(appendSheetValues.mock.calls[0][2][0][15]).toBe("Spesial")
  })

  it("rejects an invalid non-empty expense class before reserving or appending", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    getAuthContext.mockResolvedValue({ user: { id: "u1" }, accessToken: "token-1", spreadsheetId: "sheet-1", tier: "paid" })

    const { POST } = await import("@/app/api/transaction/route")
    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000, sifat: "TidakDikenal" }),
    }))

    expect(response.status).toBe(400)
    expect(ensureExpenseClassHeader).not.toHaveBeenCalled()
    expect(reserveTransaction).not.toHaveBeenCalled()
    expect(appendSheetValues).not.toHaveBeenCalled()
  })

  it("stops before quota reservation or append when the expense header migration fails", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues, ensureExpenseClassHeader } = await import("@/lib/sheets")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    getAuthContext.mockResolvedValue({ user: { id: "u1" }, accessToken: "token-1", spreadsheetId: "sheet-1", tier: "paid" })
    ensureExpenseClassHeader.mockRejectedValue(new Error("Kolom Sifat tidak dapat dimigrasikan"))

    const { POST } = await import("@/app/api/transaction/route")
    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ tanggal: "2026-08-08", kategori: "Makan", jumlah: 10000 }),
    }))

    expect(response.status).toBe(500)
    expect(reserveTransaction).not.toHaveBeenCalled()
    expect(appendSheetValues).not.toHaveBeenCalled()
  })
})
