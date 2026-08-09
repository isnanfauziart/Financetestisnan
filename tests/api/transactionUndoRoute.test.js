import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/sheets", () => ({
  ensureExpenseClassHeader: vi.fn(),
  getSheetData: vi.fn(),
  updateSheetValues: vi.fn(),
}))
vi.mock("@/lib/writeClaims", () => ({
  claimFeatureWrite: vi.fn(),
  releaseFeatureWrite: vi.fn(),
}))
vi.mock("@/lib/transactionQuota", () => ({
  reserveTransaction: vi.fn(),
  releaseTransaction: vi.fn(),
  quotaErrorResponse: vi.fn(),
}))

describe("transaction undo route", () => {
  beforeEach(() => { process.env.NEXTAUTH_SECRET = "test-secret" })
  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("restores the exact row once and rejects replay into a non-empty row", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "s1", accessToken: "token" }
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { ensureExpenseClassHeader, getSheetData, updateSheetValues } = await import("@/lib/sheets")
    const { claimFeatureWrite } = await import("@/lib/writeClaims")
    getAuthContext.mockResolvedValue(auth)
    ensureExpenseClassHeader.mockResolvedValue(undefined)
    claimFeatureWrite.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const { createUndoToken } = await import("@/lib/transactionUndo")
    const row = [
      "1 Jul 2026", "id", "Kopi", "Jajan", 15000, "", "", "BCA", 15000,
      "", "Jul", 2026, 2026, "", "", "Spesial",
    ]
    const token = createUndoToken({ userId: "u1", spreadsheetId: "s1", tab: "Pengeluaran", rowIndex: 2, row })
    const { POST } = await import("@/app/api/transaction/route")

    getSheetData.mockResolvedValueOnce([])
    const first = await POST(new Request("http://localhost/api/transaction", {
      method: "POST", body: JSON.stringify({ undoToken: token }),
    }))
    expect(first.status).toBe(200)
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token", "s1")
    expect(updateSheetValues).toHaveBeenCalledWith(
      "token", "Pengeluaran!A2:P2", [row], "s1", "RAW"
    )

    const replay = await POST(new Request("http://localhost/api/transaction", {
      method: "POST", body: JSON.stringify({ undoToken: token }),
    }))
    expect(replay.status).toBe(409)
    expect(getSheetData).toHaveBeenCalledTimes(1)
  })
})
