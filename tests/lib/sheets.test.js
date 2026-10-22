import { afterEach, describe, expect, it, vi } from "vitest"

import { GRID_ROW_HEADROOM, batchUpdateSheetValues, requiredRowsByTab } from "@/lib/sheets"

const METADATA = {
  sheets: [
    { properties: { title: "Pemasukan", sheetId: 11, gridProperties: { rowCount: 10003, columnCount: 19 } } },
    { properties: { title: "_ArtamiOperations", sheetId: 12, gridProperties: { rowCount: 1000, columnCount: 4 } } },
    { properties: { title: "Tabungan", sheetId: 13, gridProperties: { rowCount: 10000, columnCount: 21 } } },
  ],
}

function stubSheetsApi({ structuralOk = true, metadataOk = true } = {}) {
  const calls = []
  const fetchSpy = vi.fn(async (url, init = {}) => {
    if (url.includes("values:batchUpdate")) {
      calls.push({ kind: "values", url, init })
      return { ok: true, json: async () => ({ spreadsheetId: "sheet-1" }) }
    }
    if (url.includes(":batchUpdate")) {
      calls.push({ kind: "structural", url, init })
      if (!structuralOk) return { ok: false, text: async () => "expansion denied" }
      return { ok: true, json: async () => ({}) }
    }
    calls.push({ kind: "metadata", url, init })
    if (!metadataOk) return { ok: false, text: async () => "metadata denied" }
    return { ok: true, json: async () => METADATA }
  })
  vi.stubGlobal("fetch", fetchSpy)
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("requiredRowsByTab", () => {
  it("extracts the largest end row per tab", () => {
    const required = requiredRowsByTab([
      { range: "Pemasukan!A10004:S10004", values: [[]] },
      { range: "_ArtamiOperations!A69:D69", values: [[]] },
      { range: "Pemasukan!A12:S12", values: [[]] },
    ])
    expect(required.get("Pemasukan")).toBe(10004)
    expect(required.get("_ArtamiOperations")).toBe(69)
  })

  it("handles quoted tab names and single-cell ranges", () => {
    const required = requiredRowsByTab([
      { range: "'My Tab'!A3:B9", values: [[]] },
      { range: "Pemasukan!A7", values: [[]] },
    ])
    expect(required.get("My Tab")).toBe(9)
    expect(required.get("Pemasukan")).toBe(7)
  })

  it("ignores ranges without a tab or row", () => {
    const required = requiredRowsByTab([
      { range: "Pemasukan!A:A", values: [[]] },
      { values: [[]] },
      null,
    ])
    expect(required.size).toBe(0)
  })
})

describe("batchUpdateSheetValues grid expansion", () => {
  it("expands the grid before writing when the target row exceeds it (the A10004 bug)", async () => {
    const calls = stubSheetsApi()
    const data = [
      { range: "Pemasukan!A10004:S10004", values: [["1 Okt 2026"]] },
      { range: "_ArtamiOperations!A69:D69", values: [["op"]] },
    ]

    const result = await batchUpdateSheetValues("token-1", "sheet-1", data, "RAW")

    expect(result).toEqual({ spreadsheetId: "sheet-1" })
    expect(calls.map(c => c.kind)).toEqual(["metadata", "structural", "values"])

    const structural = JSON.parse(calls[1].init.body)
    expect(structural.requests).toHaveLength(1)
    expect(structural.requests[0]).toEqual({
      updateSheetProperties: {
        properties: {
          sheetId: 11,
          gridProperties: { rowCount: 10004 + GRID_ROW_HEADROOM },
        },
        fields: "gridProperties.rowCount",
      },
    })
  })

  it("writes without a structural call when every range fits the grid", async () => {
    const calls = stubSheetsApi()
    const data = [{ range: "Pemasukan!A54:S54", values: [["15 Okt 2026"]] }]

    await batchUpdateSheetValues("token-1", "sheet-1", data, "RAW")

    expect(calls.map(c => c.kind)).toEqual(["metadata", "values"])
  })

  it("fails before writing any values when the expansion is rejected", async () => {
    const calls = stubSheetsApi({ structuralOk: false })
    const data = [{ range: "Pemasukan!A10004:S10004", values: [["1 Okt 2026"]] }]

    await expect(batchUpdateSheetValues("token-1", "sheet-1", data, "RAW"))
      .rejects.toThrow("Sheets API error: expansion denied")
    expect(calls.map(c => c.kind)).toEqual(["metadata", "structural"])
  })

  it("fails before writing any values when the metadata read is rejected", async () => {
    const calls = stubSheetsApi({ metadataOk: false })
    const data = [{ range: "Pemasukan!A10004:S10004", values: [["1 Okt 2026"]] }]

    await expect(batchUpdateSheetValues("token-1", "sheet-1", data, "RAW"))
      .rejects.toThrow("Sheets API error: metadata denied")
    expect(calls.map(c => c.kind)).toEqual(["metadata"])
  })

  it("expands two deficient tabs in one structural call", async () => {
    const calls = stubSheetsApi()
    const data = [
      { range: "Pemasukan!A10004:S10004", values: [["1 Okt 2026"]] },
      { range: "Tabungan!A10001:U10001", values: [["tabungan"]] },
    ]

    await batchUpdateSheetValues("token-1", "sheet-1", data, "RAW")

    expect(calls.map(c => c.kind)).toEqual(["metadata", "structural", "values"])
    const structural = JSON.parse(calls[1].init.body)
    expect(structural.requests).toHaveLength(2)
    expect(structural.requests.map(r => r.updateSheetProperties.properties.sheetId)).toEqual([11, 13])
    expect(structural.requests.map(r => r.updateSheetProperties.properties.gridProperties.rowCount))
      .toEqual([10004 + GRID_ROW_HEADROOM, 10001 + GRID_ROW_HEADROOM])
  })

  it("leaves tabs missing from the metadata to the values call, as before", async () => {
    const calls = stubSheetsApi()
    const data = [{ range: "Hantu!A99999:B99999", values: [["x"]] }]

    await batchUpdateSheetValues("token-1", "sheet-1", data, "RAW")

    expect(calls.map(c => c.kind)).toEqual(["metadata", "values"])
  })
})
