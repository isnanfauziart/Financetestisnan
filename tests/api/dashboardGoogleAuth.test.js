import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/sheets", async () => {
  const actual = await vi.importActual("@/lib/sheets")
  return { ...actual, getSheetData: vi.fn() }
})

describe("dashboard Google auth classification (Wave 2)", () => {
  let GET
  let getAuthContextMock
  let getSheetDataMock

  beforeEach(async () => {
    const authModule = await import("@/lib/apiAuth")
    const sheetsModule = await import("@/lib/sheets")
    const route = await import("@/app/api/dashboard/route")
    GET = route.GET
    getAuthContextMock = authModule.getAuthContext
    getSheetDataMock = sheetsModule.getSheetData
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  function authFor(email) {
    return {
      user: { id: "u1", email, spreadsheet_id: "sheet-1" },
      accessToken: "t",
      spreadsheetId: "sheet-1",
      tier: "paid",
    }
  }

  it("answers a Google 401 with the recovery code and copy", async () => {
    getAuthContextMock.mockResolvedValue(authFor("regular@example.com"))
    getSheetDataMock.mockRejectedValue(new Error(
      'Sheets API error: {"error":{"code":401,"message":"Request had invalid authentication credentials.","status":"UNAUTHENTICATED"}}'
    ))

    const res = await GET(new Request("http://localhost/api/dashboard"))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.code).toBe("GOOGLE_AUTH_REQUIRED")
    expect(body.error).toContain("Sesi Google berakhir")
  })

  it("keeps unrelated failures as generic 500 errors", async () => {
    getAuthContextMock.mockResolvedValue(authFor("regular@example.com"))
    getSheetDataMock.mockRejectedValue(new Error("Connection reset"))

    const res = await GET(new Request("http://localhost/api/dashboard"))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.code).toBeUndefined()
  })
})
