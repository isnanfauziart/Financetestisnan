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

  it("returns legacy categories when the versioned category setting is absent", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockResolvedValue([["startingBalance", "0"]])

    const { GET } = await import("@/app/api/settings/route")
    const response = await GET(new Request("http://localhost/api/settings"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.settings.categories.expense.some(item => item.name === "Utang")).toBe(true)
    expect(body.settings.categories.savings.every(item => item.savingsKind)).toBe(true)
  })

  it("writes structured categories under the versioned key", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockResolvedValue([])
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" })
    vi.stubGlobal("fetch", fetchSpy)

    const categories = {
      expense: [{ name: " Kopi ", icon: "Coffee", active: true }],
      income: [],
      savings: [{ name: "Dana", icon: "Wallet", active: true, savingsKind: "liquid" }],
    }
    const { PUT } = await import("@/app/api/settings/route")
    const response = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ categories }),
    }))

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("Settings!A%3AB:append"),
      expect.objectContaining({ body: expect.stringContaining('"categories_v1"') })
    )
    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(JSON.parse(requestBody.values[0][1]).expense[0].name).toBe("Kopi")
  })

  it("rejects unknown or malformed reserved-key updates", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    const { PUT } = await import("@/app/api/settings/route")

    const response = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ key: "categories_v1", value: "{}" }),
    }))

    expect(response.status).toBe(400)
  })
})
