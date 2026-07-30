import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/sheetManager", () => ({
  ensureArtamiSheetSchema: vi.fn(async () => ({ addedTabs: [] })),
}))

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

vi.mock("@/lib/sheets", () => ({
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(),
}))

describe("legacy sheet reconnection", () => {
  const originalOwner = process.env.LEGACY_SHEET_OWNER_EMAIL

  beforeEach(() => {
    process.env.LEGACY_SHEET_OWNER_EMAIL = "owner@example.com"
  })

  afterEach(() => {
    process.env.LEGACY_SHEET_OWNER_EMAIL = originalOwner
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("allows the owner to reselect the already-linked spreadsheet", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { ensureArtamiSheetSchema } = await import("@/lib/sheetManager")
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin")
    getAuthContext.mockResolvedValue({
      user: {
        id: "user-1",
        email: "owner@example.com",
        spreadsheet_id: "sheet-123",
      },
      accessToken: "token",
    })

    const { POST } = await import("@/app/api/account/connect-legacy-sheet/route")
    const response = await POST(new Request("http://localhost/api/account/connect-legacy-sheet", {
      method: "POST",
      body: JSON.stringify({ spreadsheetId: "sheet-123" }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      success: true,
      spreadsheetId: "sheet-123",
      addedTabs: [],
    })
    expect(ensureArtamiSheetSchema).toHaveBeenCalledWith("token", "sheet-123")
    expect(supabaseAdmin.from).not.toHaveBeenCalled()
  })

  it("asks the legacy owner to reconnect when Sheets hides the linked file", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({
      user: {
        id: "user-1",
        email: "owner@example.com",
        spreadsheet_id: "sheet-123",
      },
      accessToken: "token",
      spreadsheetId: "sheet-123",
      tier: "paid",
    })
    getSheetData.mockRejectedValue(new Error(
      'Sheets API error: {"error":{"code":404,"status":"NOT_FOUND"}}'
    ))

    const { GET } = await import("@/app/api/dashboard/route")
    const response = await GET(new Request("http://localhost/api/dashboard"))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toMatchObject({
      code: "SHEET_RECONNECT_REQUIRED",
      needsSheetConnection: true,
    })
  })
})
