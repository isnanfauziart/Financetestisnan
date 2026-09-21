import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: vi.fn(() => null) }))
vi.mock("@/lib/sheets", () => ({
  ensureBillSourceHeader: vi.fn(),
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
}))
vi.mock("@/lib/recordQuota", () => ({
  runRecordCreation: vi.fn(async (_auth, _kind, _opts, fn) => fn()),
}))

const AUTH = { user: { id: "u" }, accessToken: "token", spreadsheetId: "sheet-123", tier: "pro", entitlementVerified: true }
const SOURCE = "recurring:v1:netflix|hiburan|bank bca"
const LEGACY_HEADER = ["ID", "Nama", "Jumlah", "Tipe", "KategoriBill", "KategoriTransaksi", "Frekuensi", "TanggalJatuhTempo", "AkunBank", "Aktif", "TerakhirDibayar", "Catatan", "CreatedAt"]

function legacyRow(id = "b1") {
  return [id, "Internet", 300000, "expense", "Internet", "Tagihan", "monthly", "7", "BCA", "TRUE", "", "", "2026-01-01"]
}

function convertedRow() {
  return [...legacyRow(), SOURCE]
}

function jsonRequest(body, { method = "POST" } = {}) {
  return new Request("http://localhost/api/bills", { method, body: JSON.stringify(body) })
}

// Route-internal fetches URL-encode ranges ("!" becomes "%21"); match decoded.
function fetchCalls() {
  return global.fetch.mock.calls.map(([url, options]) => [decodeURIComponent(String(url)), options])
}

beforeEach(async () => {
  vi.clearAllMocks()
  const { getAuthContext } = await import("@/lib/apiAuth")
  const { ensureBillSourceHeader } = await import("@/lib/sheets")
  getAuthContext.mockResolvedValue(AUTH)
  ensureBillSourceHeader.mockResolvedValue(undefined)
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe("bills API source fingerprints (column N)", () => {
  it("persists the fingerprint in the same appended row and prepares the header", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const { ensureBillSourceHeader } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER])
    const { POST } = await import("@/app/api/bills/route")

    const response = await POST(jsonRequest({
      nama: "Netflix", jumlah: 100000, tipe: "expense", kategoriBill: "Hiburan",
      kategoriTransaksi: "Hiburan", frekuensi: "monthly", tanggalJatuhTempo: 5,
      sourceFingerprint: SOURCE,
    }))

    expect(response.status).toBe(200)
    expect(ensureBillSourceHeader).toHaveBeenCalledWith("token", "sheet-123")
    const append = fetchCalls().find(([url]) => url.includes(":append"))
    expect(String(append[0])).toContain("Tagihan!A:N")
    const body = JSON.parse(append[1].body)
    expect(body.values[0]).toHaveLength(14)
    expect(body.values[0][13]).toBe(SOURCE)
  })

  it("keeps manual bills at the legacy 13-column append without touching the header", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const { ensureBillSourceHeader } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER])
    const { POST } = await import("@/app/api/bills/route")

    const response = await POST(jsonRequest({
      nama: "Listrik", jumlah: 250000, tipe: "expense", kategoriBill: "Listrik",
      kategoriTransaksi: "Tagihan", frekuensi: "monthly", tanggalJatuhTempo: 10,
    }))

    expect(response.status).toBe(200)
    expect(ensureBillSourceHeader).not.toHaveBeenCalled()
    const append = fetchCalls().find(([url]) => url.includes(":append"))
    expect(String(append[0])).toContain("Tagihan!A:M")
    expect(JSON.parse(append[1].body).values[0]).toHaveLength(13)
  })

  it("rejects an invalid fingerprint with 400 and writes nothing", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER])
    const { POST } = await import("@/app/api/bills/route")

    const response = await POST(jsonRequest({
      nama: "Netflix", jumlah: 100000, tipe: "expense", kategoriBill: "Hiburan",
      kategoriTransaksi: "Hiburan", frekuensi: "monthly", tanggalJatuhTempo: 5,
      sourceFingerprint: "not-a-fingerprint",
    }))

    expect(response.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns 409 when an active bill already carries the same fingerprint", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER, convertedRow()])
    const { POST } = await import("@/app/api/bills/route")

    const response = await POST(jsonRequest({
      nama: "Netflix lain", jumlah: 90000, tipe: "expense", kategoriBill: "Hiburan",
      kategoriTransaksi: "Hiburan", frekuensi: "monthly", tanggalJatuhTempo: 5,
      sourceFingerprint: SOURCE,
    }))

    expect(response.status).toBe(409)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("reads converted and legacy rows side by side on GET", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER, convertedRow(), legacyRow("b2")])
    const { GET } = await import("@/app/api/bills/route")

    const response = await GET(new Request("http://localhost/api/bills?all=true"))
    const body = await response.json()

    expect(response.status).toBe(200)
    const converted = body.bills.find(bill => bill.id === "b1")
    const legacy = body.bills.find(bill => bill.id === "b2")
    expect(converted.sourceFingerprint).toBe(SOURCE)
    expect(legacy.sourceFingerprint).toBe("")
  })

  it("persists a fingerprint on PUT and expands the row to column N", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const { ensureBillSourceHeader } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER, legacyRow()])
    const { PUT } = await import("@/app/api/bills/[id]/route")

    const response = await PUT(jsonRequest({ sourceFingerprint: SOURCE }, { method: "PUT" }), { params: { id: "b1" } })

    expect(response.status).toBe(200)
    expect(ensureBillSourceHeader).toHaveBeenCalledWith("token", "sheet-123")
    const update = fetchCalls().find(([url]) => url.includes("/values/Tagihan!A2:N2"))
    expect(update).toBeTruthy()
    const row = JSON.parse(update[1].body).values[0]
    expect(row).toHaveLength(14)
    expect(row[13]).toBe(SOURCE)
  })

  it("keeps legacy rows at 13 columns when the update has no fingerprint", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    const { ensureBillSourceHeader } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER, legacyRow()])
    const { PUT } = await import("@/app/api/bills/[id]/route")

    const response = await PUT(jsonRequest({ nama: "Internet Rumah" }, { method: "PUT" }), { params: { id: "b1" } })

    expect(response.status).toBe(200)
    expect(ensureBillSourceHeader).not.toHaveBeenCalled()
    const update = fetchCalls().find(([url]) => url.includes("/values/Tagihan!A2:M2"))
    expect(update).toBeTruthy()
    expect(JSON.parse(update[1].body).values[0]).toHaveLength(13)
  })

  it("rejects an invalid fingerprint on PUT with 400", async () => {
    const { getSheetData } = await import("@/lib/sheets")
    getSheetData.mockResolvedValue([LEGACY_HEADER, legacyRow()])
    const { PUT } = await import("@/app/api/bills/[id]/route")

    const response = await PUT(jsonRequest({ sourceFingerprint: "nope" }, { method: "PUT" }), { params: { id: "b1" } })

    expect(response.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
