import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/sheetManager", () => ({
  fetchSpreadsheetFileInfo: vi.fn(),
}))

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

function chainableUpdate(finalResult) {
  const eqSecond = vi.fn(() => finalResult)
  const eqFirst = vi.fn(() => ({ eq: eqSecond }))
  const update = vi.fn(() => ({ eq: eqFirst }))
  return { update, eqFirst, eqSecond }
}

describe("GET /api/sheets/connection", () => {
  let GET
  let getAuthContextMock
  let fetchSpreadsheetFileInfoMock
  let supabaseAdminMock

  beforeEach(async () => {
    const authModule = await import("@/lib/apiAuth")
    const sheetModule = await import("@/lib/sheetManager")
    const supaModule = await import("@/lib/supabaseAdmin")
    const route = await import("@/app/api/sheets/connection/route")
    GET = route.GET
    getAuthContextMock = authModule.getAuthContext
    fetchSpreadsheetFileInfoMock = sheetModule.fetchSpreadsheetFileInfo
    supabaseAdminMock = supaModule.supabaseAdmin
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 without an authenticated context", async () => {
    getAuthContextMock.mockResolvedValue(null)

    const res = await GET(new Request("http://localhost/api/sheets/connection"))

    expect(res.status).toBe(401)
  })

  it("returns clean disconnected metadata and touches nothing", async () => {
    getAuthContextMock.mockResolvedValue({
      user: { id: "u1", spreadsheet_id: null, spreadsheet_name: null, spreadsheet_url: null },
      accessToken: "t",
    })

    const res = await GET(new Request("http://localhost/api/sheets/connection"))
    const body = await res.json()

    expect(body).toEqual({ connected: false, needsLegacyReconnect: false, name: null, url: null })
    expect(fetchSpreadsheetFileInfoMock).not.toHaveBeenCalled()
    expect(supabaseAdminMock.from).not.toHaveBeenCalled()
  })

  it("flags the legacy reconnect requirement without claiming a connection", async () => {
    getAuthContextMock.mockResolvedValue({
      user: { id: "u1", spreadsheet_id: null },
      accessToken: "t",
      needsSheetConnection: true,
    })

    const res = await GET(new Request("http://localhost/api/sheets/connection"))
    const body = await res.json()

    expect(body).toMatchObject({ connected: false, needsLegacyReconnect: true })
  })

  it("scopes lazy metadata backfill to the signed-in user's own row", async () => {
    getAuthContextMock.mockResolvedValue({
      user: { id: "user-A", spreadsheet_id: "sheet-A", spreadsheet_name: null, spreadsheet_url: null },
      accessToken: "token-A",
    })
    fetchSpreadsheetFileInfoMock.mockResolvedValue({
      name: "Catatan Keuangan",
      url: "https://docs.google.com/spreadsheets/d/sheet-A/edit",
    })
    const chain = chainableUpdate({ error: null })
    supabaseAdminMock.from.mockReturnValue(chain)

    const res = await GET(new Request("http://localhost/api/sheets/connection"))
    const body = await res.json()

    expect(body).toEqual({
      connected: true,
      needsLegacyReconnect: false,
      name: "Catatan Keuangan",
      url: "https://docs.google.com/spreadsheets/d/sheet-A/edit",
    })
    expect(fetchSpreadsheetFileInfoMock).toHaveBeenCalledWith("token-A", "sheet-A")
    expect(supabaseAdminMock.from).toHaveBeenCalledWith("users")
    const scopedArgs = [
      ...chain.eqFirst.mock.calls.flat(),
      ...chain.eqSecond.mock.calls.flat(),
    ]
    expect(scopedArgs).toEqual(expect.arrayContaining(["user-A", "sheet-A"]))
  })

  it("keeps the endpoint working when the Drive metadata read fails", async () => {
    getAuthContextMock.mockResolvedValue({
      user: { id: "u1", spreadsheet_id: "sheet-A", spreadsheet_name: null, spreadsheet_url: null },
      accessToken: "t",
    })
    fetchSpreadsheetFileInfoMock.mockRejectedValue(new Error("drive unavailable"))

    const res = await GET(new Request("http://localhost/api/sheets/connection"))
    const body = await res.json()

    expect(body.connected).toBe(true)
    expect(body.name).toBeNull()
    expect(body.url).toBe("https://docs.google.com/spreadsheets/d/sheet-A/edit")
    expect(supabaseAdminMock.from).not.toHaveBeenCalled()
  })
})
