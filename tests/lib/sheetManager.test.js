import { describe, expect, it, afterEach, vi } from "vitest"

import { ALL_TABS, ensureArtamiSheetSchema } from "@/lib/sheetManager"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("sheetManager schema contracts", () => {
  it("provisions transaction tabs with 15 columns including event fields", () => {
    const txTabs = ALL_TABS.filter(tab => ["Pemasukan", "Pengeluaran", "Tabungan"].includes(tab.name))

    expect(txTabs).toHaveLength(3)
    for (const tab of txTabs) {
      expect(tab.cols).toBe(15)
      expect(tab.headers[0]).toEqual([
        "Tanggal",
        "ID",
        "Keterangan",
        "Kategori",
        "Jumlah",
        "Pajak",
        "Biaya",
        "AkunBank",
        "Net",
        "Catatan",
        "M",
        "Y",
        "Y2",
        "EventID",
        "EventSubKategori",
      ])
    }
  })

  it("provisions goals with the status column", () => {
    const goals = ALL_TABS.find(tab => tab.name === "Goals")

    expect(goals.cols).toBe(9)
    expect(goals.headers[0]).toEqual([
      "ID",
      "Nama",
      "Target",
      "Deadline",
      "Kategori",
      "Icon",
      "Color",
      "CreatedAt",
      "Status",
    ])
  })

  it("adds only missing Artami tabs when connecting an existing spreadsheet", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sheets: [
            { properties: { title: "Pemasukan" } },
            { properties: { title: "Pengeluaran" } },
            { properties: { title: "Tabungan" } },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    for (let i = 0; i < ALL_TABS.length - 3; i++) {
      fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    }

    vi.stubGlobal("fetch", fetchSpy)

    const result = await ensureArtamiSheetSchema("access-token", "legacy-sheet-id")

    expect(result.addedTabs).toEqual(ALL_TABS.slice(3).map(tab => tab.name))
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://sheets.googleapis.com/v4/spreadsheets/legacy-sheet-id?fields=sheets.properties.title",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      })
    )

    const [, batchInit] = fetchSpy.mock.calls[1]
    const batchBody = JSON.parse(batchInit.body)
    expect(batchBody.requests).toHaveLength(ALL_TABS.length - 3)
    expect(batchBody.requests.map(req => req.addSheet.properties.title)).toEqual(ALL_TABS.slice(3).map(tab => tab.name))

    const headerUrls = fetchSpy.mock.calls.slice(2).map(([url]) => url)
    expect(headerUrls.every(url => !url.includes("Pemasukan"))).toBe(true)
    expect(headerUrls.some(url => url.includes(encodeURIComponent("Budgets!A1:F1")))).toBe(true)
  })
})
