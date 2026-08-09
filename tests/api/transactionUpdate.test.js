import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  ensureExpenseClassHeader: vi.fn(),
  getSheetData: vi.fn(),
  updateSheetValues: vi.fn(),
}))

describe("transaction update route", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "test-secret"
  })

  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET
    vi.unstubAllGlobals()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("preserves the existing expense class and untouched columns when updating a bill payment", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { ensureExpenseClassHeader, getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    ensureExpenseClassHeader.mockResolvedValue(undefined)
    getSheetData.mockResolvedValue([[
      "6 Agu 2026", "billpay:bill-1:2026-08-06", "Internet", "Internet/WiFi", 200000,
      5000, 2500, "BCA", 192500, "paid manually", "Agu", 2026, 2026, "event-1", "subscription", "Spesial",
    ]])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/tx-1", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        type: "expense",
        tanggal: "2026-08-06",
        keterangan: "Internet diperbarui",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        akunBank: "BCA",
        rowIndex: 2,
      }),
      }), { params: { id: "billpay:bill-1:2026-08-06" } })

    expect(response.status).toBe(200)
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token-1", "sheet-1")
    expect(getSheetData).toHaveBeenCalledWith("token-1", "Pengeluaran!A2:P2", "sheet-1")
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).values[0]).toEqual([
      "6 Agu 2026", "billpay:bill-1:2026-08-06", "Internet diperbarui", "Internet/WiFi", 250000,
      5000, 2500, "BCA", 250000, "paid manually", "Agu", 2026, 2026, "event-1", "subscription", "Spesial",
    ])
  })

  it("replaces the existing expense class when sifat is provided", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([[
      "6 Agu 2026", "expense-1", "Kondangan", "Kondangan", 200000,
      "", "", "BCA", 200000, "", "Agu", 2026, 2026, "", "", "Rutin",
    ]])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/expense-1", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        type: "expense",
        tanggal: "2026-08-06",
        keterangan: "Kondangan diperbarui",
        kategori: "Kondangan",
        jumlah: "250000",
        akunBank: "BCA",
        sifat: "Spesial",
        rowIndex: 2,
      }),
    }), { params: { id: "expense-1" } })

    expect(response.status).toBe(200)
    expect(getSheetData).toHaveBeenCalledWith("token-1", "Pengeluaran!A2:P2", "sheet-1")
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).values[0]).toHaveLength(16)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).values[0][15]).toBe("Spesial")
  })

  it("rejects an invalid expense class before reading or writing the row", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([[
      "6 Agu 2026", "expense-1", "Kondangan", "Kondangan", 200000,
      "", "", "BCA", 200000, "", "Agu", 2026, 2026, "", "", "Rutin",
    ]])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/expense-1", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Kondangan",
        jumlah: "250000",
        sifat: "TidakDikenal",
        rowIndex: 2,
      }),
    }), { params: { id: "expense-1" } })

    expect(response.status).toBe(400)
    expect(getSheetData).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ["an invalid calendar date", { tanggal: "2026-02-30" }],
    ["an invalid date format", { tanggal: "06-08-2026" }],
    ["a zero amount", { jumlah: "0" }],
    ["a negative amount", { jumlah: "-1" }],
    ["a non-finite amount", { jumlah: "not-a-number" }],
    ["an amount above the maximum", { jumlah: "1000000000000" }],
  ])("returns 400 before Sheets write for %s", async (_label, overrides) => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([["6 Aug 2026", "actual-id"]])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/actual-id", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
        ...overrides,
      }),
    }), { params: { id: "actual-id" } })

    expect(response.status).toBe(400)
    expect(getSheetData).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 404 without writing when the target row is missing", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/tx-1", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "tx-1" } })

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 404 without writing when the URL ID differs from the row ID", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([["6 Aug 2026", "actual-id", "Internet"]])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/requested-id", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "requested-id" } })

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("accepts the deterministic dashboard fallback ID for a blank persisted ID", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([["6 Aug 2026", "", "Internet"]])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/ex-1", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "ex-1" } })

    expect(response.status).toBe(200)
  })

  it("rejects a non-fallback URL ID when the persisted ID is blank", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([["6 Aug 2026", "", "Internet"]])

    const { PUT } = await import("@/app/api/transaction/[id]/route")
    const response = await PUT(new Request("http://localhost/api/transaction/wrong-id", {
      method: "PUT",
      body: JSON.stringify({
        tab: "Pengeluaran",
        tanggal: "2026-08-06",
        kategori: "Internet/WiFi",
        jumlah: "250000",
        rowIndex: 2,
      }),
    }), { params: { id: "wrong-id" } })

    expect(response.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 404 without clearing when the DELETE URL ID differs from the row ID", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, updateSheetValues } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([["6 Aug 2026", "actual-id", "Internet"]])

    const { DELETE } = await import("@/app/api/transaction/[id]/route")
    const response = await DELETE(new Request("http://localhost/api/transaction/requested-id", {
      method: "DELETE",
      body: JSON.stringify({ tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "requested-id" } })

    expect(response.status).toBe(404)
    expect(updateSheetValues).not.toHaveBeenCalled()
  })

  it("clears the row when the DELETE URL ID matches the persisted ID", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { ensureExpenseClassHeader, getSheetData, updateSheetValues } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    ensureExpenseClassHeader.mockResolvedValue(undefined)
    getSheetData.mockResolvedValue([['6 Aug 2026', 'actual-id', 'Internet', '', '', '', '', '', '', '', '', '', '', '', '', 'Spesial']])

    const { DELETE } = await import("@/app/api/transaction/[id]/route")
    const response = await DELETE(new Request("http://localhost/api/transaction/actual-id", {
      method: "DELETE",
      body: JSON.stringify({ tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "actual-id" } })

    expect(response.status).toBe(200)
    expect(ensureExpenseClassHeader).toHaveBeenCalledWith("token-1", "sheet-1")
    expect(updateSheetValues).toHaveBeenCalledWith(
      "token-1",
      "Pengeluaran!A2:P2",
      [Array(16).fill("")],
      "sheet-1",
      "RAW",
    )
  })

  it("clears the row when the DELETE URL ID matches its synthetic ID", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, updateSheetValues } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([['6 Aug 2026', '', 'Internet']])

    const { DELETE } = await import("@/app/api/transaction/[id]/route")
    const response = await DELETE(new Request("http://localhost/api/transaction/ex-1", {
      method: "DELETE",
      body: JSON.stringify({ tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "ex-1" } })

    expect(response.status).toBe(200)
    expect(updateSheetValues).toHaveBeenCalledTimes(1)
  })

  it("returns 404 without writing when a blank persisted ID has a mismatched synthetic ID", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, updateSheetValues } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([['6 Aug 2026', '', 'Internet']])

    const { DELETE } = await import("@/app/api/transaction/[id]/route")
    const response = await DELETE(new Request("http://localhost/api/transaction/ex-99", {
      method: "DELETE",
      body: JSON.stringify({ tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "ex-99" } })

    expect(response.status).toBe(404)
    expect(updateSheetValues).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("returns 404 without writing when the DELETE row is missing", async () => {
    const auth = { user: { id: "u1" }, spreadsheetId: "sheet-1", accessToken: "token-1" }
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData, updateSheetValues } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue(auth)
    getSheetData.mockResolvedValue([])

    const { DELETE } = await import("@/app/api/transaction/[id]/route")
    const response = await DELETE(new Request("http://localhost/api/transaction/ex-1", {
      method: "DELETE",
      body: JSON.stringify({ tab: "Pengeluaran", rowIndex: 2 }),
    }), { params: { id: "ex-1" } })

    expect(response.status).toBe(404)
    expect(updateSheetValues).not.toHaveBeenCalled()
  })
})
