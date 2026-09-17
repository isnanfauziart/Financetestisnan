import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { expenseClassToSheet } from "./expenseClass"
import { describeTabSchema } from "./financialSchema"
import { movementCellIndexes } from "./movement"
import { getWibDateParts } from "./wibCalendar"

/**
 * One place for the ledger column layout so every money-moving route writes the
 * same shape: A–O common columns (A–P for `Pengeluaran`, which keeps `Sifat` at
 * P), then the checkpoint/allocation metadata columns from the financial schema.
 */

export function columnLetterFor(index) {
  let n = Number(index) + 1
  let out = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export function ledgerWidth(tab) {
  return describeTabSchema(tab)?.width || 0
}

export function ledgerRange(tab, rowIndex) {
  const last = columnLetterFor(ledgerWidth(tab) - 1)
  return `${tab}!A${rowIndex}:${last}${rowIndex}`
}

export function ledgerColumnRange(tab) {
  return describeTabSchema(tab)?.readRange || `${tab}!A:A`
}

export function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false
  const [year, month, day] = String(value).split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function formatSheetDate(tanggal) {
  const [year, month, day] = String(tanggal || "").split("-")
  const monthName = AVAILABLE_MONTHS[Number(month) - 1]
  if (!year || !monthName || !day) return String(tanggal || "")
  return `${Number(day)} ${monthName} ${year}`
}

export function sheetMonthParts(tanggal) {
  const [year, month] = String(tanggal || "").split("-")
  const monthName = AVAILABLE_MONTHS[Number(month) - 1] || ""
  return { monthName, year: String(year || "") }
}

export function dateFromSheetRow(row) {
  const raw = String(row?.[0] || "").trim()
  const match = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!match) return ""
  const monthIndex = AVAILABLE_MONTHS.indexOf(match[2])
  if (monthIndex < 0) return ""
  return `${match[3]}-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`
}

/** Jakarta (WIB) today, matching the existing quota and bill conventions. */
export function wibToday(now = new Date()) {
  const parts = getWibDateParts(now)
  if (!parts) return { tanggal: "", monthName: "", year: "", formatted: "" }
  const monthName = AVAILABLE_MONTHS[parts.monthIndex] || ""
  const year = String(parts.year)
  const tanggal = `${year}-${String(parts.monthIndex + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
  return { tanggal, monthName, year, formatted: `${parts.day} ${monthName} ${year}` }
}

/**
 * @param recordedAt ISO timestamp stamped on the row so a checkpoint can be
 *                   traced back to the rows that followed it.
 */
export function buildLedgerRow({
  tab,
  tanggal,
  id = "",
  keterangan = "",
  kategori = "",
  amount = 0,
  akunBank = "",
  catatan = "",
  eventId = "",
  eventSubKategori = "",
  sifat = "",
  goalId = "",
  allocationStatus = "",
  allocationRemaining = "",
  movementKind = "",
  checkpointId = "",
  relatedRecordId = "",
  recordedAt = "",
} = {}) {
  const width = ledgerWidth(tab)
  if (!width) throw new Error(`Tab ledger tidak dikenal: ${tab}`)
  const row = new Array(width).fill("")

  row[0] = formatSheetDate(tanggal)
  row[1] = id
  row[2] = keterangan
  row[3] = kategori
  row[4] = amount
  row[7] = akunBank
  row[8] = amount
  row[9] = catatan
  row[13] = eventId || ""
  row[14] = eventSubKategori || ""

  const { monthName, year } = sheetMonthParts(tanggal)
  row[10] = monthName
  row[11] = year === "" ? "" : Number(year)
  row[12] = year === "" ? "" : Number(year)

  if (tab === "Pengeluaran") row[15] = expenseClassToSheet(sifat)

  const indexes = movementCellIndexes(tab)
  if (tab === "Tabungan") {
    row[15] = goalId
    row[16] = allocationStatus
    row[17] = allocationRemaining === "" ? "" : allocationRemaining
  } else if (indexes.checkpointId !== null) {
    row[indexes.checkpointId] = checkpointId
  }
  if (indexes.movementKind !== null) row[indexes.movementKind] = movementKind
  if (indexes.relatedRecordId !== null) row[indexes.relatedRecordId] = relatedRecordId
  if (indexes.recordedAt !== null && recordedAt) row[indexes.recordedAt] = recordedAt

  return row
}
