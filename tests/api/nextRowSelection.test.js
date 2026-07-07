import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/sheets", () => ({
  getSheetData: vi.fn(),
  parseRupiah: vi.fn(value => Number(value) || 0),
}))

function makeFilledColumn(lastRow) {
  return Array.from({ length: lastRow }, (_, i) => [i === 0 ? "Tanggal" : `row-${i + 1}`])
}

describe("next row selection", () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("writes a new transaction to row 10000 when row 9999 is already occupied", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData.mockResolvedValue(makeFilledColumn(9999))

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedRange: "Pemasukan!A10000:O10000" }),
      text: async () => "",
    })
    vi.stubGlobal("fetch", fetchSpy)

    const { POST } = await import("@/app/api/transaction/route")
    const req = new Request("http://localhost/api/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tanggal: "2026-07-07", kategori: "Gaji", jumlah: "100000", type: "income" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.rowIndex).toBe(10000)
    expect(getSheetData).toHaveBeenCalledWith("token", "Pemasukan!A:A", "sheet-123")
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("Pemasukan!A10000%3AO10000"),
      expect.objectContaining({ method: "PUT" })
    )
  })

  it("writes bill payment transactions to row 10000 when row 9999 is already occupied", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({ accessToken: "token", spreadsheetId: "sheet-123" })
    getSheetData
      .mockResolvedValueOnce([
        ["ID", "Nama", "Jumlah", "Tipe", "KategoriBill", "KategoriTransaksi", "Frekuensi", "TanggalJatuhTempo", "AkunBank", "Aktif", "TerakhirDibayar", "Catatan", "CreatedAt"],
        ["bill-1", "Gaji Bulanan", "150000", "income", "Payroll", "Gaji", "monthly", "1", "BCA", "TRUE", "", "", "2026-07-07"],
      ])
      .mockResolvedValueOnce(makeFilledColumn(9999))

    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updatedRange: "Pemasukan!A10000:M10000" }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updatedRange: "Tagihan!A2:M2" }),
        text: async () => "",
      })
    vi.stubGlobal("fetch", fetchSpy)

    const { POST } = await import("@/app/api/bills/pay/route")
    const req = new Request("http://localhost/api/bills/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billId: "bill-1" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.transaction.row).toBe(10000)
    expect(getSheetData).toHaveBeenNthCalledWith(2, "token", "Pemasukan!A:A", "sheet-123")
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Pemasukan!A10000%3AM10000"),
      expect.objectContaining({ method: "PUT" })
    )
  })
})
