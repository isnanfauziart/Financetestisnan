import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/sheets", () => ({
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(String(value).replace(/[^0-9.-]/g, "")) || 0),
}))

describe("settings route", () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("writes starting balance with RAW string values so Sheets does not coerce it into a date", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockResolvedValue([
      ["startingBalance", "7000000"],
      ["startingBalanceDate", "2026-07-07"],
    ])

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      text: async () => "",
    })
    vi.stubGlobal("fetch", fetchSpy)

    const { PUT } = await import("@/app/api/settings/route")
    const req = new Request("http://localhost/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [
          ["startingBalance", 10000000],
          ["startingBalanceDate", "2026-07-07"],
        ],
      }),
    })

    const res = await PUT(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Settings!A1%3AB1?valueInputOption=RAW"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ values: [["startingBalance", "10000000"]] }),
      })
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("Settings!A2%3AB2?valueInputOption=RAW"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ values: [["startingBalanceDate", "2026-07-07"]] }),
      })
    )
  })
})
