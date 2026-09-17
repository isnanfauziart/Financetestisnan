import { afterEach, describe, expect, it, vi } from "vitest"

import {
  OPERATIONS_SHEET,
  SCHEMA_STATUS,
  SchemaConflictError,
  applyFinancialSchema,
  buildSchemaPlan,
  columnLetter,
  describeTabSchema,
  ensureFinancialSchema,
  readFinancialSchema,
} from "@/lib/financialSchema"

const BASE_HEADERS = [
  "Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net",
  "Catatan", "M", "Y", "Y2", "EventID", "EventSubKategori",
]

function sheet(title, sheetId, columnCount) {
  return { title, sheetId, columnCount }
}

const LEGACY_SHEETS = [
  sheet("Pemasukan", 1, 15),
  sheet("Pengeluaran", 2, 16),
  sheet("Tabungan", 3, 15),
  sheet("Utang", 4, 9),
]

const UTANG_HEADERS = ["ID", "NamaOrang", "Jumlah", "Arah", "JatuhTempo", "Status", "SisaSaldo", "Catatan", "CreatedAt"]

function legacyHeaders() {
  return {
    Pemasukan: [...BASE_HEADERS],
    Pengeluaran: [...BASE_HEADERS, "Sifat"],
    Tabungan: [...BASE_HEADERS],
    Utang: [...UTANG_HEADERS],
  }
}

function upgradedSheets() {
  return [
    sheet("Pemasukan", 1, 19),
    sheet("Pengeluaran", 2, 20),
    sheet("Tabungan", 3, 21),
    sheet("Utang", 4, 13),
    sheet(OPERATIONS_SHEET.name, 5, 4),
  ]
}

function upgradedHeaders() {
  return {
    Pemasukan: [...BASE_HEADERS, "CheckpointId", "RecordedAt", "MovementKind", "RelatedRecordId"],
    Pengeluaran: [...BASE_HEADERS, "Sifat", "CheckpointId", "RecordedAt", "MovementKind", "RelatedRecordId"],
    Tabungan: [...BASE_HEADERS, "GoalId", "AllocationStatus", "SisaAlokasi", "RecordedAt", "MovementKind", "RelatedRecordId"],
    Utang: [...UTANG_HEADERS, "EntryMode", "AkunBank", "RecordedAt", "OperationId"],
    [OPERATIONS_SHEET.name]: [...OPERATIONS_SHEET.headers],
  }
}

function stubSheetsApi({ sheets, headers, batchUpdate } = {}) {
  const calls = []
  const fetchSpy = vi.fn(async (url, init = {}) => {
    calls.push({ url, init })
    if (url.includes("values:batchGet")) {
      const ranges = new URL(url).searchParams.getAll("ranges")
      return {
        ok: true,
        json: async () => ({
          valueRanges: ranges.map(range => {
            const title = range.split("!")[0]
            return { range, values: headers[title] ? [headers[title]] : [] }
          }),
        }),
      }
    }
    if (url.includes(":batchUpdate") || url.includes("values:batchUpdate")) {
      if (batchUpdate) return batchUpdate(url, init)
      return { ok: true, json: async () => ({}) }
    }
    return { ok: true, json: async () => ({ sheets: (sheets || []).map(entry => ({ properties: {
      title: entry.title,
      sheetId: entry.sheetId,
      gridProperties: { columnCount: entry.columnCount },
    } })) }) }
  })
  vi.stubGlobal("fetch", fetchSpy)
  return { fetchSpy, calls }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("financial schema plan", () => {
  it("plans an additive upgrade for a legacy spreadsheet", () => {
    const plan = buildSchemaPlan({ sheets: LEGACY_SHEETS, headers: legacyHeaders() })

    expect(plan.status).toBe(SCHEMA_STATUS.upgrade)
    expect(plan.conflicts).toEqual([])
    expect(plan.addTabs.map(tab => tab.name)).toEqual([OPERATIONS_SHEET.name])
    expect(plan.addTabs[0].hidden).toBe(true)
    expect(plan.expansions.map(expansion => [expansion.tab, expansion.columnCount])).toEqual([
      ["Pemasukan", 19],
      ["Pengeluaran", 20],
      ["Tabungan", 21],
      ["Utang", 13],
    ])

    const written = plan.headerWrites.map(write => `${write.tab}!${write.column}1=${write.header}`)
    expect(written).toEqual([
      "Pemasukan!P1=CheckpointId",
      "Pemasukan!Q1=RecordedAt",
      "Pemasukan!R1=MovementKind",
      "Pemasukan!S1=RelatedRecordId",
      "Pengeluaran!Q1=CheckpointId",
      "Pengeluaran!R1=RecordedAt",
      "Pengeluaran!S1=MovementKind",
      "Pengeluaran!T1=RelatedRecordId",
      "Tabungan!P1=GoalId",
      "Tabungan!Q1=AllocationStatus",
      "Tabungan!R1=SisaAlokasi",
      "Tabungan!S1=RecordedAt",
      "Tabungan!T1=MovementKind",
      "Tabungan!U1=RelatedRecordId",
      "Utang!J1=EntryMode",
      "Utang!K1=AkunBank",
      "Utang!L1=RecordedAt",
      "Utang!M1=OperationId",
      "_ArtamiOperations!A1=OperationId",
      "_ArtamiOperations!B1=Kind",
      "_ArtamiOperations!C1=RelatedId",
      "_ArtamiOperations!D1=CommittedAt",
    ])
  })

  it("never rewrites the existing Sifat column", () => {
    const plan = buildSchemaPlan({ sheets: LEGACY_SHEETS, headers: legacyHeaders() })
    expect(plan.headerWrites.some(write => write.tab === "Pengeluaran" && write.column === "P")).toBe(false)
  })

  it("reports nothing to do once every column exists", () => {
    const plan = buildSchemaPlan({ sheets: upgradedSheets(), headers: upgradedHeaders() })
    expect(plan.status).toBe(SCHEMA_STATUS.ok)
    expect(plan.headerWrites).toEqual([])
    expect(plan.expansions).toEqual([])
    expect(plan.addTabs).toEqual([])
  })

  it("fills only the still-blank headers", () => {
    const headers = legacyHeaders()
    headers.Pemasukan = [...BASE_HEADERS, "CheckpointId", "", "", ""]
    const plan = buildSchemaPlan({ sheets: LEGACY_SHEETS, headers })

    expect(plan.status).toBe(SCHEMA_STATUS.upgrade)
    expect(plan.headerWrites.filter(write => write.tab === "Pemasukan").map(write => write.column)).toEqual(["Q", "R", "S"])
  })

  it("reports a conflict instead of overwriting an occupied column", () => {
    const headers = legacyHeaders()
    headers.Pemasukan = [...BASE_HEADERS.slice(0, 15), "Catatan Tambahan"]
    const plan = buildSchemaPlan({ sheets: LEGACY_SHEETS, headers })

    expect(plan.status).toBe(SCHEMA_STATUS.conflict)
    expect(plan.conflicts).toEqual([
      { tab: "Pemasukan", column: "P", header: "CheckpointId", found: "Catatan Tambahan" },
    ])
    expect(plan.headerWrites).toEqual([])
    expect(plan.expansions).toEqual([])
    expect(plan.addTabs).toEqual([])
  })

  it("accepts a matching header regardless of letter case", () => {
    const headers = legacyHeaders()
    headers.Utang = [...UTANG_HEADERS, "entrymode", "AkunBank", "RecordedAt", "OperationId"]
    const plan = buildSchemaPlan({ sheets: LEGACY_SHEETS, headers })

    expect(plan.status).toBe(SCHEMA_STATUS.upgrade)
    expect(plan.headerWrites.some(write => write.tab === "Utang" && write.column === "J")).toBe(false)
  })

  it("reports unavailable when the structure cannot be read", () => {
    const plan = buildSchemaPlan({ sheets: LEGACY_SHEETS, headers: {}, headersAvailable: false })
    expect(plan.status).toBe(SCHEMA_STATUS.unavailable)
    expect(plan.headerWrites).toEqual([])
    expect(plan.expansions).toEqual([])
  })

  it("reports unavailable when a financial tab is missing", () => {
    const plan = buildSchemaPlan({
      sheets: LEGACY_SHEETS.filter(entry => entry.title !== "Tabungan"),
      headers: { Pemasukan: [...BASE_HEADERS], Pengeluaran: [...BASE_HEADERS, "Sifat"], Utang: [...UTANG_HEADERS] },
    })
    expect(plan.status).toBe(SCHEMA_STATUS.unavailable)
  })

  it("keeps the planned read range in step with the appended columns", () => {
    expect(describeTabSchema("Pengeluaran").readRange).toBe("Pengeluaran!A:T")
    expect(describeTabSchema("Tabungan").readRange).toBe("Tabungan!A:U")
    expect(describeTabSchema("Pemasukan").readRange).toBe("Pemasukan!A:S")
    expect(describeTabSchema("Utang").readRange).toBe("Utang!A:M")
    expect(columnLetter(15)).toBe("P")
    expect(columnLetter(20)).toBe("U")
  })
})

describe("financial schema upgrade", () => {
  it("applies one atomic structure call and one header call for a legacy sheet", async () => {
    const { fetchSpy } = stubSheetsApi({ sheets: LEGACY_SHEETS, headers: legacyHeaders() })

    const result = await ensureFinancialSchema("token-1", "sheet-1")

    expect(result.applied).toBe(true)
    const structureCalls = fetchSpy.mock.calls.filter(([url]) => url.endsWith(":batchUpdate") && !url.includes("values:batchUpdate"))
    expect(structureCalls).toHaveLength(1)
    const requests = JSON.parse(structureCalls[0][1].body).requests
    expect(requests[0].addSheet.properties).toMatchObject({
      title: OPERATIONS_SHEET.name,
      hidden: true,
      gridProperties: { columnCount: 4 },
    })
    expect(requests.filter(request => request.updateSheetProperties)).toHaveLength(4)

    const headerCalls = fetchSpy.mock.calls.filter(([url]) => url.includes("values:batchUpdate"))
    expect(headerCalls).toHaveLength(1)
    const headerData = JSON.parse(headerCalls[0][1].body)
    expect(headerData.valueInputOption).toBe("RAW")
    expect(headerData.data).toHaveLength(22)
    expect(headerData.data[0]).toEqual({ range: "Pemasukan!P1", values: [["CheckpointId"]] })
  })

  it("is idempotent: a second run performs no write", async () => {
    const { fetchSpy } = stubSheetsApi({ sheets: upgradedSheets(), headers: upgradedHeaders() })

    const result = await ensureFinancialSchema("token-1", "sheet-1")

    expect(result.applied).toBe(false)
    expect(fetchSpy.mock.calls.some(([url]) => url.includes(":batchUpdate") || url.includes("values:batchUpdate"))).toBe(false)
  })

  it("refuses to upgrade a conflicting spreadsheet and writes nothing", async () => {
    const headers = legacyHeaders()
    headers.Tabungan = [...BASE_HEADERS.slice(0, 15), "Diisi Manual"]
    const { fetchSpy } = stubSheetsApi({ sheets: LEGACY_SHEETS, headers })

    await expect(ensureFinancialSchema("token-1", "sheet-1")).rejects.toBeInstanceOf(SchemaConflictError)
    expect(fetchSpy.mock.calls.some(([url]) => url.includes(":batchUpdate") || url.includes("values:batchUpdate"))).toBe(false)
  })

  it("does not apply an upgrade when the plan is unavailable", async () => {
    const { fetchSpy } = stubSheetsApi({
      sheets: LEGACY_SHEETS,
      headers: legacyHeaders(),
      batchUpdate: () => ({ ok: false, text: async () => "should not be called" }),
    })
    const metadataOnly = vi.fn(async (url) => {
      if (url.includes("values:batchGet")) return { ok: false, text: async () => "unavailable" }
      return {
        ok: true,
        json: async () => ({ sheets: LEGACY_SHEETS.map(entry => ({ properties: {
          title: entry.title,
          sheetId: entry.sheetId,
          gridProperties: { columnCount: entry.columnCount },
        } })) }),
      }
    })
    vi.stubGlobal("fetch", metadataOnly)

    await expect(ensureFinancialSchema("token-1", "sheet-1")).rejects.toThrow("belum dapat diverifikasi")
    expect(metadataOnly.mock.calls.some(([url]) => url.includes(":batchUpdate"))).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("reads structure without writing on a read path", async () => {
    const { fetchSpy } = stubSheetsApi({ sheets: LEGACY_SHEETS, headers: legacyHeaders() })

    const { plan } = await readFinancialSchema("token-1", "sheet-1")

    expect(plan.status).toBe(SCHEMA_STATUS.upgrade)
    expect(fetchSpy.mock.calls.some(([url, init]) => url.includes(":batchUpdate") || init?.method === "POST")).toBe(false)
  })

  it("rejects an upgrade that carries conflicts", async () => {
    const plan = {
      status: SCHEMA_STATUS.upgrade,
      conflicts: [{ tab: "Utang", column: "J", header: "EntryMode", found: "X" }],
      addTabs: [],
      expansions: [],
      headerWrites: [],
    }
    await expect(applyFinancialSchema("token-1", "sheet-1", plan)).rejects.toBeInstanceOf(SchemaConflictError)
  })
})
