import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  appendSheetValues: vi.fn(),
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
}))
vi.mock("@/lib/recordQuota", () => ({
  runRecordCreations: vi.fn(),
}))

const auth = {
  user: { id: "u1" },
  accessToken: "token-1",
  spreadsheetId: "sheet-1",
  tier: "free",
  isAdmin: false,
  entitlementVerified: true,
}

const body = {
  source: { bulan: "Agu", tahun: "2026" },
  destination: { bulan: "Sep", tahun: "2026" },
  items: [
    { rowIndex: 2, kategori: "Jajan", akun: "", limit: 500000 },
    { rowIndex: 3, kategori: "Transportasi", akun: "Bank BCA", limit: 300000 },
  ],
}

const rows = [
  ["Kategori", "Bulan", "Tahun", "Limit", "Akun", "Catatan"],
  ["Jajan", "Agu", "2026", 450000, "", "Juli carryover"],
  ["Transportasi", "Agu", "2026", 280000, "Bank BCA", ""],
]

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe("budget copy route", () => {
  it("rejects an unauthenticated copy", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    getAuthContext.mockResolvedValue(null)
    const { POST } = await import("@/app/api/budgets/copy/route")

    const response = await POST(new Request("http://localhost/api/budgets/copy", {
      method: "POST",
      body: JSON.stringify(body),
    }))

    expect(response.status).toBe(401)
  })

  it("passes the full selection through one quota call and one append", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues, getSheetData } = await import("@/lib/sheets")
    const { runRecordCreations } = await import("@/lib/recordQuota")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue(rows)
    runRecordCreations.mockImplementation(async (_auth, _feature, _options, _count, create) => create(rows))
    appendSheetValues.mockResolvedValue({ updates: { updatedRows: 2 } })
    const { POST } = await import("@/app/api/budgets/copy/route")

    const response = await POST(new Request("http://localhost/api/budgets/copy", {
      method: "POST",
      body: JSON.stringify(body),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      copied: 2,
      destination: { bulan: "Sep", tahun: "2026" },
    })
    expect(runRecordCreations).toHaveBeenCalledWith(
      auth,
      "budgets",
      { month: "Sep", year: "2026" },
      2,
      expect.any(Function),
      { serializeUnlimited: true },
    )
    expect(appendSheetValues).toHaveBeenCalledOnce()
    expect(appendSheetValues).toHaveBeenCalledWith(
      "token-1",
      "Budgets!A:F",
      [
        ["Jajan", "Sep", "2026", 500000, "", ""],
        ["Transportasi", "Sep", "2026", 300000, "Bank BCA", ""],
      ],
      "sheet-1",
      "USER_ENTERED",
    )
  })

  it.each([
    ["same periods", {
      ...body,
      destination: { bulan: "Agu", tahun: "2026" },
    }],
    ["missing selection", {
      ...body,
      items: [],
    }],
  ])("rejects %s before the quota call", async (_label, requestBody) => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { runRecordCreations } = await import("@/lib/recordQuota")
    getAuthContext.mockResolvedValue(auth)
    const { POST } = await import("@/app/api/budgets/copy/route")

    const response = await POST(new Request("http://localhost/api/budgets/copy", {
      method: "POST",
      body: JSON.stringify(requestBody),
    }))

    expect(response.status).toBe(400)
    expect(runRecordCreations).not.toHaveBeenCalled()
  })

  it("rejects a source row that changed before save without appending", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues, getSheetData } = await import("@/lib/sheets")
    const { runRecordCreations } = await import("@/lib/recordQuota")
    getAuthContext.mockResolvedValue(auth)
    runRecordCreations.mockImplementation(async (_auth, _feature, _options, _count, create) => create([
      rows[0],
      ["Jajan", "Agu", "2026", 450000, "OVO", ""],
    ]))
    getSheetData.mockResolvedValue(rows)
    const { POST } = await import("@/app/api/budgets/copy/route")

    const response = await POST(new Request("http://localhost/api/budgets/copy", {
      method: "POST",
      body: JSON.stringify({ ...body, items: [body.items[0]] }),
    }))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ code: "BUDGET_COPY_STALE" })
    expect(appendSheetValues).not.toHaveBeenCalled()
  })

  it("rejects an existing destination composite key without appending", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues } = await import("@/lib/sheets")
    const { runRecordCreations } = await import("@/lib/recordQuota")
    getAuthContext.mockResolvedValue(auth)
    runRecordCreations.mockImplementation(async (_auth, _feature, _options, _count, create) => create([
      ...rows,
      ["Jajan", "Sep", "2026", 400000, "", "existing"],
    ]))
    const { POST } = await import("@/app/api/budgets/copy/route")

    const response = await POST(new Request("http://localhost/api/budgets/copy", {
      method: "POST",
      body: JSON.stringify({ ...body, items: [body.items[0]] }),
    }))

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({ code: "BUDGET_COPY_DUPLICATE" })
    expect(appendSheetValues).not.toHaveBeenCalled()
  })

  it("returns a refresh-safe response when the append outcome is ambiguous", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { appendSheetValues } = await import("@/lib/sheets")
    const { runRecordCreations } = await import("@/lib/recordQuota")
    getAuthContext.mockResolvedValue(auth)
    runRecordCreations.mockImplementation(async (_auth, _feature, _options, _count, create) => create(rows))
    appendSheetValues.mockRejectedValue(new Error("network timeout"))
    const { POST } = await import("@/app/api/budgets/copy/route")

    const response = await POST(new Request("http://localhost/api/budgets/copy", {
      method: "POST",
      body: JSON.stringify({ ...body, items: [body.items[0]] }),
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      code: "BUDGET_COPY_RETRY",
      retryable: true,
    })
  })
})
