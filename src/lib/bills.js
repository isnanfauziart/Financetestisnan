import { parseRupiah } from "@/lib/sheets"

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function toIsoDate(date) {
  const normalized = startOfDay(date)
  const year = normalized.getFullYear()
  const month = String(normalized.getMonth() + 1).padStart(2, "0")
  const day = String(normalized.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function clampDay(year, monthIndex, dayOfMonth) {
  return Math.min(Math.max(1, dayOfMonth), daysInMonth(year, monthIndex))
}

function buildMonthlyDueDate(year, monthIndex, dayOfMonth) {
  return new Date(year, monthIndex, clampDay(year, monthIndex, dayOfMonth))
}

function parseIsoDate(value) {
  if (!value) return null
  const parsed = new Date(`${String(value).trim()}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function getCurrentCycleDueDate(bill, referenceDate) {
  const dueDay = parseInt(bill.tanggalJatuhTempo, 10) || 1
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  return buildMonthlyDueDate(year, month, dueDay)
}

function getNextCycleDueDate(bill, referenceDate) {
  const dueDay = parseInt(bill.tanggalJatuhTempo, 10) || 1
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  return buildMonthlyDueDate(year, month + 1, dueDay)
}

export function rowToBill(row, rowIndex) {
  return {
    rowIndex,
    id: String(row[0] || "").trim(),
    nama: String(row[1] || "").trim(),
    jumlah: parseRupiah(row[2] || 0),
    tipe: String(row[3] || "expense").trim().toLowerCase(),
    kategoriBill: String(row[4] || "").trim(),
    kategoriTransaksi: String(row[5] || "").trim(),
    frekuensi: String(row[6] || "monthly").trim().toLowerCase(),
    tanggalJatuhTempo: parseInt(row[7], 10) || 1,
    akunBank: String(row[8] || "").trim(),
    aktif: String(row[9] || "TRUE").trim().toUpperCase() === "TRUE",
    terakhirDibayar: String(row[10] || "").trim(),
    catatan: String(row[11] || "").trim(),
    createdAt: String(row[12] || "").trim(),
  }
}

export function computeBillStatus(bill, now = new Date()) {
  const today = startOfDay(now)
  const currentCycleDue = getCurrentCycleDueDate(bill, today)
  const lastPaid = parseIsoDate(bill.terakhirDibayar)
  const isPaidForCurrentCycle = lastPaid && lastPaid >= currentCycleDue

  let effectiveDue = currentCycleDue
  if (isPaidForCurrentCycle) {
    effectiveDue = getNextCycleDueDate(bill, today)
  }

  const diffDays = Math.round((startOfDay(effectiveDue) - today) / (1000 * 60 * 60 * 24))
  let status = "upcoming"
  if (diffDays < 0) status = "overdue"
  else if (diffDays === 0) status = "due_today"
  else if (diffDays <= 1) status = "due_soon"

  return {
    daysUntilDue: diffDays,
    status,
    nextDueDate: toIsoDate(effectiveDue),
    currentCycleDueDate: toIsoDate(currentCycleDue),
    isPaidForCurrentCycle: Boolean(isPaidForCurrentCycle),
  }
}

export function buildBillSummary(rows, { limitUpcoming = null, now = new Date() } = {}) {
  const upcoming = []
  const overdue = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0] || !row[1]) continue

    const bill = rowToBill(row, i + 1)
    if (!bill.aktif) continue

    const computed = computeBillStatus(bill, now)
    const item = { ...bill, ...computed }

    if (item.status === "overdue") overdue.push(item)
    else upcoming.push(item)
  }

  upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  overdue.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

  const visibleUpcoming = limitUpcoming == null ? upcoming : upcoming.slice(0, limitUpcoming)

  return {
    upcoming: visibleUpcoming,
    overdue,
    totalUpcoming: upcoming.reduce((sum, bill) => sum + bill.jumlah, 0),
    totalOverdue: overdue.reduce((sum, bill) => sum + bill.jumlah, 0),
    overdueCount: overdue.length,
  }
}
