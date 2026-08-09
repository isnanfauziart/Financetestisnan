import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
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

describe("manual transaction quota flow", () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("validates calendar dates before reserving quota", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    getAuthContext.mockResolvedValue({ user: { id: "u" }, tier: "free", accessToken: "t", spreadsheetId: "s" })
    const { POST } = await import("@/app/api/transaction/route")
    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ tanggal: "2026-02-30", kategori: "Makan", jumlah: 1 }),
    }))
    expect(response.status).toBe(400)
    expect(reserveTransaction).not.toHaveBeenCalled()
  })

  it("releases a reservation when Sheets append fails", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues } = await import("@/lib/sheets")
    const { reserveTransaction, releaseTransaction } = await import("@/lib/transactionQuota")
    const auth = { user: { id: "u" }, tier: "free", entitlementVerified: true, accessToken: "t", spreadsheetId: "s" }
    getAuthContext.mockResolvedValue(auth)
    reserveTransaction.mockResolvedValue({ userId: "u", period: "2026-07", current: 1 })
    appendSheetValues.mockRejectedValue(new Error("Sheets down"))
    const { POST } = await import("@/app/api/transaction/route")
    const response = await POST(new Request("http://localhost/api/transaction", {
      method: "POST",
      body: JSON.stringify({ tanggal: "2026-07-28", kategori: "Makan", jumlah: 1 }),
    }))
    expect(response.status).toBe(500)
    expect(releaseTransaction).toHaveBeenCalledWith({ userId: "u", period: "2026-07", current: 1 })
  })
})
