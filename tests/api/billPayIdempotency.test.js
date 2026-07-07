import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/sheets", () => ({
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
}))

describe("bill payment idempotency", () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("does not create a duplicate transaction if the bill is already marked paid today", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-07T08:00:00.000Z"))

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockResolvedValue([
      ["ID", "Nama", "Jumlah", "Tipe", "KategoriBill", "KategoriTransaksi", "Frekuensi", "TanggalJatuhTempo", "AkunBank", "Aktif", "TerakhirDibayar", "Catatan", "CreatedAt"],
      ["bill-1", "Internet", "300000", "expense", "Internet/WiFi", "Tagihan", "monthly", "7", "BCA", "TRUE", "2026-07-07", "", "2026-01-01"],
    ])

    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

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
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
