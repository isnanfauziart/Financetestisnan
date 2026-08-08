import { describe, expect, it, afterEach, vi } from "vitest"

import { ALL_TABS, createUserSheet, ensureArtamiSheetSchema } from "@/lib/sheetManager"
import { ensureExpenseClassHeader } from "@/lib/sheets"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("sheetManager schema contracts", () => {
  it("provisions only the expense tab with the Sifat column", () => {
    const txTabs = ALL_TABS.filter(tab => ["Pemasukan", "Pengeluaran", "Tabungan"].includes(tab.name))
    const baseHeaders = [
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
    ]

    expect(txTabs).toHaveLength(3)
    for (const name of ["Pemasukan", "Tabungan"]) {
      expect(txTabs.find(tab => tab.name === name)).toMatchObject({ cols: 15, headers: [baseHeaders] })
    }
    expect(txTabs.find(tab => tab.name === "Pengeluaran")).toMatchObject({
      cols: 16,
      headers: [[...baseHeaders, "Sifat"]],
    })
  })

  it("migrates a blank expense class header", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ values: [[""]] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    vi.stubGlobal("fetch", fetchSpy)

    await ensureExpenseClassHeader("access-token", "sheet-id")

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[1][0]).toContain("Pengeluaran!P1")
    expect(fetchSpy.mock.calls[1][1]).toMatchObject({ method: "PUT" })
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body)).toEqual({ values: [["Sifat"]] })
  })

  it("does not write an existing expense class header", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ values: [["Sifat"]] }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    await ensureExpenseClassHeader("access-token", "sheet-id")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("refuses to overwrite a conflicting expense class header", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ values: [["Other"]] }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    await expect(ensureExpenseClassHeader("access-token", "sheet-id"))
      .rejects.toThrow("Kolom Sifat tidak dapat dimigrasikan")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
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

  it("seeds starter categories for newly created sheets", async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ spreadsheetId: "new-sheet" }) })
      .mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal("fetch", fetchSpy)

    await createUserSheet("access-token", "Ari")

    expect(fetchSpy.mock.calls[1][0]).toContain("Pemasukan!A1%3AO1")
    expect(fetchSpy.mock.calls[2][0]).toContain("Pengeluaran!A1%3AP1")
    expect(fetchSpy.mock.calls[3][0]).toContain("Tabungan!A1%3AO1")
    expect(JSON.parse(fetchSpy.mock.calls[2][1].body).values[0]).toHaveLength(16)

    const settingsSeedCall = fetchSpy.mock.calls.find(([url]) => url.includes("Settings!A2%3AB2"))
    expect(settingsSeedCall).toBeTruthy()
    expect(settingsSeedCall[1].body).toContain("categories_v1")
    expect(settingsSeedCall[1].body).toContain("Makan & Minum")
  })
})
