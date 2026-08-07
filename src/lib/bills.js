import { parseRupiah } from "@/lib/sheets"

const DAY_MS = 24 * 60 * 60 * 1000
const JAKARTA_TIME_ZONE = "Asia/Jakarta"
const SUPPORTED_FREQUENCIES = new Set(["weekly", "biweekly", "monthly", "quarterly", "yearly"])

function makeCalendarDate(year, monthIndex, day) {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) return null
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > daysInMonth(year, monthIndex)) return null
  return new Date(Date.UTC(year, monthIndex, day))
}

function calendarDateFromInstant(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map(part => [part.type, part.value]))

  return makeCalendarDate(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
}

function parseCalendarDate(value) {
  if (value instanceof Date || typeof value === "number") return calendarDateFromInstant(value)
  if (!value) return null

  const text = String(value).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (match) return makeCalendarDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]))

  return calendarDateFromInstant(text)
}

function toIsoDate(date) {
  const normalized = date instanceof Date ? date : parseCalendarDate(date)
  if (!normalized || Number.isNaN(normalized.getTime())) return null
  return `${normalized.getUTCFullYear()}-${String(normalized.getUTCMonth() + 1).padStart(2, "0")}-${String(normalized.getUTCDate()).padStart(2, "0")}`
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function clampDay(year, monthIndex, dayOfMonth) {
  return Math.min(Math.max(1, dayOfMonth), daysInMonth(year, monthIndex))
}

function buildMonthlyDueDate(year, monthIndex, dayOfMonth) {
  return makeCalendarDate(year, monthIndex, clampDay(year, monthIndex, dayOfMonth))
}

function parseIsoDate(value) {
  return parseCalendarDate(value)
}

function readInteger(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function getDayOfMonth(value) {
  const day = readInteger(value)
  return day !== null && day >= 1 && day <= 31 ? day : null
}

function getWeekday(value) {
  const weekday = readInteger(value)
  return weekday !== null && weekday >= 1 && weekday <= 7 ? weekday : null
}

function getFrequency(bill) {
  return String(bill?.frekuensi || "monthly").trim().toLowerCase()
}

function getMonthArgs(year, monthIndex) {
  const normalizedYear = Number(year)
  const normalizedMonth = Number(monthIndex)
  if (!Number.isInteger(normalizedYear) || normalizedYear < 1) return null
  if (!Number.isInteger(normalizedMonth) || normalizedMonth < 0 || normalizedMonth > 11) return null
  return { year: normalizedYear, monthIndex: normalizedMonth }
}

function addDays(date, days) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function addMonths(year, monthIndex, months) {
  const result = new Date(Date.UTC(year, monthIndex + months, 1))
  return { year: result.getUTCFullYear(), monthIndex: result.getUTCMonth() }
}

function weekday(date) {
  return date.getUTCDay() || 7
}

function monthOccurrences(year, monthIndex, createDate) {
  const start = makeCalendarDate(year, monthIndex, 1)
  const end = makeCalendarDate(year, monthIndex, daysInMonth(year, monthIndex))
  if (!start || !end) return []

  const occurrences = []
  let candidate = createDate()
  while (candidate && candidate <= end) {
    if (candidate >= start) occurrences.push(toIsoDate(candidate))
    candidate = createDate(candidate)
  }
  return occurrences
}

function monthlyOccurrences(year, monthIndex, bill) {
  const dueDay = getDayOfMonth(bill?.tanggalJatuhTempo)
  if (dueDay === null) return []
  const dueDate = buildMonthlyDueDate(year, monthIndex, dueDay)
  const createdAt = parseCalendarDate(bill?.createdAt)
  return !createdAt || dueDate >= createdAt ? [toIsoDate(dueDate)] : []
}

function weeklyOccurrences(year, monthIndex, bill) {
  const dueWeekday = getWeekday(bill?.tanggalJatuhTempo)
  const createdAt = parseCalendarDate(bill?.createdAt)
  const first = makeCalendarDate(year, monthIndex, 1)
  const last = makeCalendarDate(year, monthIndex, daysInMonth(year, monthIndex))
  if (dueWeekday === null || !first || !last) return []

  const firstOccurrence = addDays(first, (dueWeekday - weekday(first) + 7) % 7)
  return monthOccurrences(year, monthIndex, (previous) => {
    if (!previous) return firstOccurrence
    return addDays(previous, 7)
  }).filter(date => !createdAt || date >= toIsoDate(createdAt))
}

function biweeklyOccurrences(year, monthIndex, bill) {
  const dueWeekday = getWeekday(bill?.tanggalJatuhTempo)
  const createdAt = parseCalendarDate(bill?.createdAt)
  const first = makeCalendarDate(year, monthIndex, 1)
  const last = makeCalendarDate(year, monthIndex, daysInMonth(year, monthIndex))
  if (dueWeekday === null || !createdAt || !first || !last) return []

  const firstOccurrence = addDays(createdAt, (dueWeekday - weekday(createdAt) + 7) % 7)
  const daysToStart = Math.ceil((first.getTime() - firstOccurrence.getTime()) / DAY_MS)
  const firstInMonth = daysToStart > 0
    ? addDays(firstOccurrence, Math.ceil(daysToStart / 14) * 14)
    : firstOccurrence

  return monthOccurrences(year, monthIndex, (previous) => {
    if (!previous) return firstInMonth
    return addDays(previous, 14)
  }).filter(date => date <= toIsoDate(last))
}

function quarterlyOccurrences(year, monthIndex, bill) {
  const createdAt = parseCalendarDate(bill?.createdAt)
  const dueDay = getDayOfMonth(bill?.tanggalJatuhTempo)
  if (!createdAt || dueDay === null) return []

  const monthDelta = (year - createdAt.getUTCFullYear()) * 12
    + (monthIndex - createdAt.getUTCMonth())
  if (monthDelta < 0 || monthDelta % 3 !== 0) return []

  const dueDate = buildMonthlyDueDate(year, monthIndex, dueDay)
  return dueDate >= createdAt ? [toIsoDate(dueDate)] : []
}

function yearlyOccurrences(year, monthIndex, bill) {
  const createdAt = parseCalendarDate(bill?.createdAt)
  if (!createdAt || monthIndex !== createdAt.getUTCMonth() || year < createdAt.getUTCFullYear()) return []

  const hasConfiguredDay = bill?.tanggalJatuhTempo !== null
    && bill?.tanggalJatuhTempo !== undefined
    && String(bill.tanggalJatuhTempo).trim() !== ""
  const dueDay = hasConfiguredDay ? getDayOfMonth(bill.tanggalJatuhTempo) : createdAt.getUTCDate()
  if (dueDay === null) return []

  const dueDate = buildMonthlyDueDate(year, monthIndex, dueDay)
  return dueDate >= createdAt ? [toIsoDate(dueDate)] : []
}

/**
 * Return date-only ISO occurrences for a bill in a Jakarta calendar month.
 * monthIndex is zero-based, matching JavaScript Date month indexes.
 */
export function getBillOccurrencesInMonth(bill, year, monthIndex) {
  const month = getMonthArgs(year, monthIndex)
  if (!month) return []

  switch (getFrequency(bill)) {
    case "monthly":
      return monthlyOccurrences(month.year, month.monthIndex, bill)
    case "weekly":
      return weeklyOccurrences(month.year, month.monthIndex, bill)
    case "biweekly":
      return biweeklyOccurrences(month.year, month.monthIndex, bill)
    case "quarterly":
      return quarterlyOccurrences(month.year, month.monthIndex, bill)
    case "yearly":
      return yearlyOccurrences(month.year, month.monthIndex, bill)
    default:
      return []
  }
}

/** Return the first occurrence strictly after afterDate, or null when invalid. */
export function getNextBillOccurrence(bill, afterDate) {
  const after = parseCalendarDate(afterDate)
  if (!after || !SUPPORTED_FREQUENCIES.has(getFrequency(bill))) return null

  const afterKey = toIsoDate(after)
  for (let offset = 0; offset < 1200; offset++) {
    const month = addMonths(after.getUTCFullYear(), after.getUTCMonth(), offset)
    const next = getBillOccurrencesInMonth(bill, month.year, month.monthIndex)
      .find(date => date > afterKey)
    if (next) return next
  }
  return null
}

function getLatestBillOccurrence(bill, onOrBeforeDate) {
  const referenceDate = parseCalendarDate(onOrBeforeDate)
  if (!referenceDate) return null

  const referenceKey = toIsoDate(referenceDate)
  for (let offset = 0; offset < 1200; offset++) {
    const month = addMonths(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), -offset)
    const latest = getBillOccurrencesInMonth(bill, month.year, month.monthIndex)
      .filter(date => date <= referenceKey)
      .pop()
    if (latest) return latest
  }

  return null
}

function getCurrentCycleDueDate(bill, referenceDate) {
  const year = referenceDate.getUTCFullYear()
  const monthIndex = referenceDate.getUTCMonth()
  const today = toIsoDate(referenceDate)
  const occurrences = getBillOccurrencesInMonth(bill, year, monthIndex)
  if (occurrences.length) {
    const latestCurrent = [...occurrences].reverse().find(date => date <= today)
    if (latestCurrent) return latestCurrent

    if (getFrequency(bill) !== "monthly") {
      return getLatestBillOccurrence(bill, referenceDate) || occurrences[0]
    }

    return getLatestBillOccurrence(bill, referenceDate)
      || occurrences.find(date => date >= today)
      || occurrences[occurrences.length - 1]
  }

  return getLatestBillOccurrence(bill, referenceDate)
    || getNextBillOccurrence(bill, toIsoDate(addDays(referenceDate, -1)))
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
  const today = calendarDateFromInstant(now)
  if (!today) {
    return {
      daysUntilDue: null,
      status: "upcoming",
      nextDueDate: null,
      currentCycleDueDate: null,
      isPaidForCurrentCycle: false,
    }
  }

  const currentCycleDue = getCurrentCycleDueDate(bill, today)
  const currentCycleDueDate = parseIsoDate(currentCycleDue)
  if (!currentCycleDueDate) {
    return {
      daysUntilDue: null,
      status: "upcoming",
      nextDueDate: null,
      currentCycleDueDate: null,
      isPaidForCurrentCycle: false,
    }
  }

  const lastPaid = parseIsoDate(bill.terakhirDibayar)
  const isPaidForCurrentCycle = Boolean(lastPaid && lastPaid >= currentCycleDueDate)

  let effectiveDue = currentCycleDue
  if (isPaidForCurrentCycle) {
    effectiveDue = getNextBillOccurrence(bill, currentCycleDue)
  }

  const effectiveDueDate = parseIsoDate(effectiveDue)
  if (!effectiveDueDate) {
    return {
      daysUntilDue: null,
      status: "upcoming",
      nextDueDate: null,
      currentCycleDueDate: toIsoDate(currentCycleDueDate),
      isPaidForCurrentCycle,
    }
  }

  const diffDays = Math.round((effectiveDueDate - today) / DAY_MS)
  let status = "upcoming"
  if (diffDays < 0) status = "overdue"
  else if (diffDays === 0) status = "due_today"
  else if (diffDays <= 1) status = "due_soon"

  return {
    daysUntilDue: diffDays,
    status,
    nextDueDate: toIsoDate(effectiveDueDate),
    currentCycleDueDate: toIsoDate(currentCycleDueDate),
    isPaidForCurrentCycle,
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
