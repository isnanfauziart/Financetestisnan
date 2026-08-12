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

  it("returns empty user-name settings by default", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockResolvedValue([])

    const { GET } = await import("@/app/api/settings/route")
    const response = await GET(new Request("http://localhost/api/settings"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.settings.userName).toBe("")
    expect(body.settings.userNamePromptDismissed).toBe(false)
    expect(body.settings.financialFreedomMonthlyExpenseOverride).toBeNull()
  })

  it("reads and writes the optional financial freedom expense override", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([["financialFreedomMonthlyExpenseOverride", "12000000"]])

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" })
    vi.stubGlobal("fetch", fetchSpy)

    const { GET, PUT } = await import("@/app/api/settings/route")
    const saveResponse = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates: [["financialFreedomMonthlyExpenseOverride", 12_000_000]] }),
    }))
    const readResponse = await GET(new Request("http://localhost/api/settings"))

    expect(saveResponse.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("Settings!A%3AB:append"),
      expect.objectContaining({ body: JSON.stringify({ values: [["financialFreedomMonthlyExpenseOverride", "12000000"]] }) })
    )
    expect((await readResponse.json()).settings.financialFreedomMonthlyExpenseOverride).toBe(12_000_000)
  })

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["fractional", 1000.5],
    ["too large", 1_000_000_000_000],
  ])("rejects a %s financial freedom expense override", async (_label, value) => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    const { PUT } = await import("@/app/api/settings/route")

    const response = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates: [["financialFreedomMonthlyExpenseOverride", value]] }),
    }))

    expect(response.status).toBe(400)
  })

  it("serializes a blank financial freedom expense override as a clear", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockResolvedValue([["financialFreedomMonthlyExpenseOverride", "12000000"]])
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" })
    vi.stubGlobal("fetch", fetchSpy)

    const { PUT } = await import("@/app/api/settings/route")
    const response = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates: [["financialFreedomMonthlyExpenseOverride", ""]] }),
    }))

    expect(response.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("Settings!A1%3AB1?valueInputOption=RAW"),
      expect.objectContaining({ body: JSON.stringify({ values: [["financialFreedomMonthlyExpenseOverride", ""]] }) })
    )
  })

  it("does not turn a Settings read failure into empty user-name settings", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockRejectedValue(new Error("Sheets unavailable"))

    const { GET } = await import("@/app/api/settings/route")
    const response = await GET(new Request("http://localhost/api/settings"))

    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe("Terjadi kesalahan internal")
  })

  it("trims a saved user name and allows clearing it", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([["userName", "Siti"]])

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" })
    vi.stubGlobal("fetch", fetchSpy)

    const { PUT } = await import("@/app/api/settings/route")
    const saveResponse = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates: [["userName", "  Siti  "]] }),
    }))
    const clearResponse = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates: [["userName", ""]] }),
    }))

    expect(saveResponse.status).toBe(200)
    expect(clearResponse.status).toBe(200)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Settings!A%3AB:append"),
      expect.objectContaining({ body: JSON.stringify({ values: [["userName", "Siti"]] }) })
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("Settings!A1%3AB1?valueInputOption=RAW"),
      expect.objectContaining({ body: JSON.stringify({ values: [["userName", ""]] }) })
    )
  })

  it("serializes and parses prompt dismissal as a boolean", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([["userNamePromptDismissed", "true"]])
      .mockResolvedValueOnce([["userNamePromptDismissed", "true"]])
      .mockResolvedValueOnce([["userNamePromptDismissed", "false"]])

    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" })
    vi.stubGlobal("fetch", fetchSpy)

    const { GET, PUT } = await import("@/app/api/settings/route")
    const trueResponse = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates: [["userNamePromptDismissed", true]] }),
    }))
    const falseResponse = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates: [["userNamePromptDismissed", false]] }),
    }))
    const parsedTrue = await GET(new Request("http://localhost/api/settings"))
    const parsedFalse = await GET(new Request("http://localhost/api/settings"))

    expect(trueResponse.status).toBe(200)
    expect(falseResponse.status).toBe(200)
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Settings!A%3AB:append"),
      expect.objectContaining({ body: JSON.stringify({ values: [["userNamePromptDismissed", "true"]] }) })
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("Settings!A1%3AB1?valueInputOption=RAW"),
      expect.objectContaining({ body: JSON.stringify({ values: [["userNamePromptDismissed", "false"]] }) })
    )
    expect((await parsedTrue.json()).settings.userNamePromptDismissed).toBe(true)
    expect((await parsedFalse.json()).settings.userNamePromptDismissed).toBe(false)
  })

  it.each([
    ["a non-string name", [["userName", 123]]],
    ["a name longer than 60 characters", [["userName", "😀".repeat(61)]]],
    ["a non-boolean dismissal value", [["userNamePromptDismissed", "true"]]],
  ])("rejects %s", async (_description, updates) => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    const { PUT } = await import("@/app/api/settings/route")

    const response = await PUT(new Request("http://localhost/api/settings", {
      method: "PUT",
      body: JSON.stringify({ updates }),
    }))

    expect(response.status).toBe(400)
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
