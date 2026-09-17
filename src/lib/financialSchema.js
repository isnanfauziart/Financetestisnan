/**
 * Additive financial schema for the checkpoint/allocation model.
 *
 * The upgrade only ever appends columns beyond the current financial columns and
 * fills blank header cells. An unexpected occupied target cell is reported as a
 * conflict so callers can show a read-only warning instead of overwriting data.
 */

export const FINANCIAL_SCHEMA = {
  Pemasukan: {
    base: 15,
    columns: ["CheckpointId", "RecordedAt", "MovementKind", "RelatedRecordId"],
  },
  Pengeluaran: {
    // `Sifat` stays at column P (index 15); everything below is appended after it.
    base: 16,
    columns: ["CheckpointId", "RecordedAt", "MovementKind", "RelatedRecordId"],
  },
  Tabungan: {
    base: 15,
    columns: ["GoalId", "AllocationStatus", "SisaAlokasi", "RecordedAt", "MovementKind", "RelatedRecordId"],
  },
  Utang: {
    base: 9,
    columns: ["EntryMode", "AkunBank", "RecordedAt", "OperationId"],
  },
}

export const FINANCIAL_SCHEMA_TABS = Object.keys(FINANCIAL_SCHEMA)

export const OPERATIONS_SHEET = {
  name: "_ArtamiOperations",
  headers: ["OperationId", "Kind", "RelatedId", "CommittedAt"],
  cols: 4,
}

export const SCHEMA_STATUS = {
  ok: "ok",
  upgrade: "upgrade",
  conflict: "conflict",
  unavailable: "unavailable",
}

export class SchemaConflictError extends Error {
  constructor(plan) {
    const first = plan?.conflicts?.[0]
    super(first
      ? `Kolom ${first.column} pada tab ${first.tab} berisi "${first.found}" dan tidak dapat dimigrasikan`
      : "Struktur Google Sheets tidak dapat dimigrasikan")
    this.name = "SchemaConflictError"
    this.code = "SCHEMA_CONFLICT"
    this.plan = plan
  }
}

/** 0-based column index to A1 letters. */
export function columnLetter(index) {
  let n = Number(index) + 1
  let out = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export function describeTabSchema(tab) {
  const spec = FINANCIAL_SCHEMA[tab]
  if (!spec) return null
  const lastIndex = spec.base + spec.columns.length - 1
  return {
    tab,
    base: spec.base,
    width: spec.base + spec.columns.length,
    lastColumn: columnLetter(lastIndex),
    headerRange: `${tab}!A1:${columnLetter(lastIndex)}1`,
    readRange: `${tab}!A:${columnLetter(lastIndex)}`,
    columns: spec.columns.map((header, offset) => ({
      header,
      index: spec.base + offset,
      column: columnLetter(spec.base + offset),
    })),
  }
}

export function describeOperationsSchema() {
  const lastIndex = OPERATIONS_SHEET.headers.length - 1
  return {
    tab: OPERATIONS_SHEET.name,
    width: OPERATIONS_SHEET.cols,
    headerRange: `${OPERATIONS_SHEET.name}!A1:${columnLetter(lastIndex)}1`,
    readRange: `${OPERATIONS_SHEET.name}!A:${columnLetter(lastIndex)}`,
    columns: OPERATIONS_SHEET.headers.map((header, index) => ({
      header,
      index,
      column: columnLetter(index),
    })),
  }
}

function normalizeHeaderRow(row) {
  return Array.isArray(row) ? row.map(cell => String(cell ?? "").trim()) : []
}

function headersMatch(found, expected) {
  return found.toLowerCase() === expected.toLowerCase()
}

/**
 * Pure planning step: decide what an upgrade would add, or which occupied
 * columns make the spreadsheet unsafe to upgrade.
 *
 * @param sheets  [{ title, sheetId, columnCount }]
 * @param headers { [tab]: string[] } header rows for the tabs that exist
 */
export function buildSchemaPlan({ sheets = [], headers = {}, headersAvailable = true } = {}) {
  const conflicts = []
  const addTabs = []
  const expansions = []
  const headerWrites = []

  const targets = [
    ...FINANCIAL_SCHEMA_TABS.map(tab => describeTabSchema(tab)),
    describeOperationsSchema(),
  ]

  for (const target of targets) {
    const sheet = sheets.find(candidate => candidate.title === target.tab)

    if (!sheet) {
      addTabs.push({
        name: target.tab,
        cols: target.width,
        headers: target.columns.map(column => column.header),
        hidden: target.tab === OPERATIONS_SHEET.name,
      })
      for (const column of target.columns) {
        headerWrites.push({ tab: target.tab, column: column.column, index: column.index, header: column.header })
      }
      continue
    }

    const row = normalizeHeaderRow(headers[target.tab])
    let conflicted = false
    for (const column of target.columns) {
      const found = row[column.index] || ""
      if (found && !headersMatch(found, column.header)) {
        conflicts.push({ tab: target.tab, column: column.column, header: column.header, found })
        conflicted = true
      }
    }
    if (conflicted) continue

    for (const column of target.columns) {
      if (!row[column.index]) {
        headerWrites.push({ tab: target.tab, column: column.column, index: column.index, header: column.header })
      }
    }

    const columnCount = Number(sheet.columnCount || 0)
    if (!Number.isFinite(columnCount) || columnCount < target.width) {
      expansions.push({ tab: target.tab, sheetId: sheet.sheetId, columnCount: target.width })
    }
  }

  if (conflicts.length > 0) {
    return { status: SCHEMA_STATUS.conflict, conflicts, addTabs: [], expansions: [], headerWrites: [] }
  }

  const missingFinancialTabs = addTabs.filter(tab => tab.name !== OPERATIONS_SHEET.name)
  if (!headersAvailable) {
    return { status: SCHEMA_STATUS.unavailable, conflicts, addTabs: [], expansions: [], headerWrites: [] }
  }
  if (missingFinancialTabs.length > 0) {
    // Financial tabs are provisioned elsewhere; their headers cannot be planned here.
    return { status: SCHEMA_STATUS.unavailable, conflicts, addTabs: [], expansions: [], headerWrites: [] }
  }

  const nothingToDo = addTabs.length === 0 && expansions.length === 0 && headerWrites.length === 0
  return {
    status: nothingToDo ? SCHEMA_STATUS.ok : SCHEMA_STATUS.upgrade,
    conflicts,
    addTabs,
    expansions,
    headerWrites,
  }
}

export function schemaStatusLabel(status) {
  if (status === SCHEMA_STATUS.conflict) return "Struktur Google Sheets perlu ditinjau"
  if (status === SCHEMA_STATUS.unavailable) return "Struktur Google Sheets belum dapat diverifikasi"
  return ""
}

/**
 * Kept well below the two-minute financial-write lock expiry so a slow Sheets
 * call can never outlive the lock that protects it.
 */
export const SHEETS_TIMEOUT_MS = 20000

function timeoutSignal(timeoutMs = SHEETS_TIMEOUT_MS) {
  return typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? AbortSignal.timeout(timeoutMs)
    : undefined
}

function sheetsHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
}

async function readSpreadsheetMetadata(accessToken, spreadsheetId) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: timeoutSignal(),
  })
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
  const metadata = await res.json()
  return (metadata.sheets || []).map(sheet => ({
    title: sheet.properties?.title,
    sheetId: sheet.properties?.sheetId,
    columnCount: Number(sheet.properties?.gridProperties?.columnCount || 0),
  })).filter(sheet => sheet.title)
}

/**
 * Reads structure only. Never writes, so it is safe on read paths.
 */
export async function readFinancialSchema(accessToken, spreadsheetId) {
  const sheets = await readSpreadsheetMetadata(accessToken, spreadsheetId)
  const targets = [
    ...FINANCIAL_SCHEMA_TABS.map(tab => describeTabSchema(tab)),
    describeOperationsSchema(),
  ]
  const ranges = targets
    .filter(target => sheets.some(sheet => sheet.title === target.tab))
    .map(target => target.headerRange)

  const headers = {}
  let headersAvailable = true
  if (ranges.length > 0) {
    try {
      const query = ranges.map(range => `ranges=${encodeURIComponent(range)}`).join("&")
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${query}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: timeoutSignal() }
      )
      if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
      const valueRanges = (await res.json()).valueRanges || []
      valueRanges.forEach((valueRange, index) => {
        const tab = ranges[index]?.split("!")[0]
        const title = tab ? tab.replace(/^'|'$/g, "") : null
        if (title) headers[title] = valueRange.values?.[0] || []
      })
    } catch (error) {
      headersAvailable = false
    }
  }

  return { sheets, headers, plan: buildSchemaPlan({ sheets, headers, headersAvailable }) }
}

/**
 * Applies a plan in two idempotent calls: structure first, then blank headers.
 */
export async function applyFinancialSchema(accessToken, spreadsheetId, plan) {
  if (!plan || plan.status !== SCHEMA_STATUS.upgrade) return { applied: false, plan }
  if (plan.conflicts?.length) throw new SchemaConflictError(plan)

  const requests = []
  for (const tab of plan.addTabs || []) {
    requests.push({
      addSheet: {
        properties: {
          title: tab.name,
          ...(tab.hidden ? { hidden: true } : {}),
          gridProperties: { rowCount: 1000, columnCount: tab.cols },
        },
      },
    })
  }
  for (const expansion of plan.expansions || []) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: expansion.sheetId,
          gridProperties: { columnCount: expansion.columnCount },
        },
        fields: "gridProperties.columnCount",
      },
    })
  }

  if (requests.length > 0) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: sheetsHeaders(accessToken),
      body: JSON.stringify({ requests }),
      signal: timeoutSignal(),
    })
    if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
  }

  if ((plan.headerWrites || []).length > 0) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: "POST",
      headers: sheetsHeaders(accessToken),
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: plan.headerWrites.map(write => ({
          range: `${write.tab}!${write.column}1`,
          values: [[write.header]],
        })),
      }),
      signal: timeoutSignal(),
    })
    if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
  }

  return { applied: true, plan }
}

/**
 * Ensures the spreadsheet can hold the checkpoint/allocation columns.
 * Throws SchemaConflictError when an occupied column blocks the upgrade.
 */
export async function ensureFinancialSchema(accessToken, spreadsheetId) {
  const { plan } = await readFinancialSchema(accessToken, spreadsheetId)
  if (plan.status === SCHEMA_STATUS.conflict) throw new SchemaConflictError(plan)
  if (plan.status === SCHEMA_STATUS.unavailable) {
    throw new Error("Struktur Google Sheets belum dapat diverifikasi")
  }
  const result = await applyFinancialSchema(accessToken, spreadsheetId, plan)
  return { plan, applied: Boolean(result.applied) }
}
