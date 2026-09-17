import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/sheets", () => ({ getSheetData: vi.fn() }))

const COMMITTED_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
const UNKNOWN_ID = "99999999-8888-4777-8666-555555555555"
const AUTH = { user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet-a", tier: "free" }

function get(id) {
  return new Request(`http://localhost/api/financial-operations/${id}`)
}

beforeEach(async () => {
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { getSheetData } = await import("@/lib/sheets")
  getAuthContext.mockResolvedValue(AUTH)
  getSheetData.mockResolvedValue([
    ["OperationId", "Kind", "RelatedId", "CommittedAt"],
    [COMMITTED_ID, "transaction_create", "TX-1", "2026-08-11T03:00:00.000Z"],
  ])
})

afterEach(() => {
  vi.resetModules()
})

describe("financial operation lookup", () => {
  it("requires authentication", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(null)
    const { GET } = await import("@/app/api/financial-operations/[operationId]/route")

    const response = await GET(get(COMMITTED_ID), { params: { operationId: COMMITTED_ID } })

    expect(response.status).toBe(401)
    expect(getSheetData).not.toHaveBeenCalled()
  })

  it("reports a committed operation", async () => {
    const { GET } = await import("@/app/api/financial-operations/[operationId]/route")

    const body = await (await GET(get(COMMITTED_ID), { params: { operationId: COMMITTED_ID } })).json()

    expect(body).toEqual({
      success: true,
      operationId: COMMITTED_ID,
      status: "already_committed",
      resolved: true,
      committed: true,
      committedAt: "2026-08-11T03:00:00.000Z",
      relatedId: "TX-1",
      kind: "transaction_create",
    })
  })

  it("reports a confirmed absence as not committed", async () => {
    const { GET } = await import("@/app/api/financial-operations/[operationId]/route")

    const body = await (await GET(get(UNKNOWN_ID), { params: { operationId: UNKNOWN_ID } })).json()

    expect(body).toMatchObject({ success: true, resolved: true, committed: false, status: "not_committed" })
  })

  it("rejects a malformed operation id before reading the sheet", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const { GET } = await import("@/app/api/financial-operations/[operationId]/route")

    const response = await GET(get("not-a-uuid"), { params: { operationId: "not-a-uuid" } })

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe("OPERATION_ID_REQUIRED")
    expect(getSheetData).not.toHaveBeenCalled()
  })

  it("reads only the authenticated user's spreadsheet", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const { GET } = await import("@/app/api/financial-operations/[operationId]/route")

    await GET(get(COMMITTED_ID), { params: { operationId: COMMITTED_ID } })

    expect(getSheetData.mock.calls[0][2]).toBe("sheet-a")
  })

  it("reports an unreadable receipt table as unresolved, never as absent", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockRejectedValue(new Error("Sheets API error: 503 Service Unavailable"))
    const { GET } = await import("@/app/api/financial-operations/[operationId]/route")

    const body = await (await GET(get(COMMITTED_ID), { params: { operationId: COMMITTED_ID } })).json()

    expect(body).toMatchObject({ resolved: false, committed: null, status: "unresolved" })
    expect(body.message).toBe("Status belum dapat dipastikan")
  })

  it("treats a missing receipt tab as a knowable absence", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockRejectedValue(new Error("Sheets API error: {\"error\":{\"code\":400,\"message\":\"Unable to parse range: _ArtamiOperations!A:D\"}}"))
    const { GET } = await import("@/app/api/financial-operations/[operationId]/route")

    const body = await (await GET(get(COMMITTED_ID), { params: { operationId: COMMITTED_ID } })).json()

    expect(body).toMatchObject({ resolved: true, committed: false, status: "not_committed" })
  })
})
