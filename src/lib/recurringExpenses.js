import { MONTHS_MAP } from "@/app/dashboard/_components/constants"
import { isSpecialExpense } from "@/lib/expenseClass"
import { daysInMonth, getWibDateParts, monthSerial } from "@/lib/wibCalendar"

const WINDOW_MONTHS = 4
const MAX_DEVIATION = 0.2
const MAX_DAY_SPREAD = 7
const MAX_FINGERPRINT_LENGTH = 200

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("id-ID")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function ledgerDateParts(value) {
  const raw = String(value || "").trim()
  const match = raw.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/)
  if (match) {
    const monthIndex = MONTHS_MAP[match[2]]
    const year = Number(match[3])
    const day = Number(match[1])
    if (monthIndex === undefined || !Number.isInteger(year) || day < 1 || day > daysInMonth(year, monthIndex)) return null
    return { year, monthIndex, day }
  }
  return getWibDateParts(raw)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function hashFingerprint(value) {
  let first = 2166136261
  let second = 374761393
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    first = Math.imul(first ^ code, 16777619)
    second = Math.imul(second ^ code, 2246822519)
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`
}

function createFingerprint(key) {
  const legacy = `recurring:v1:${key}`
  return legacy.length <= MAX_FINGERPRINT_LENGTH ? legacy : `recurring:v2:${hashFingerprint(key)}`
}

function billNameMatches(candidate, bill) {
  const name = normalizeText(bill?.nama)
  if (!name) return false
  const description = normalizeText(candidate.description)
  return name === description || name.includes(description) || description.includes(name)
}

function matchesBill(candidate, bill) {
  if (!billNameMatches(candidate, bill)) return false
  return normalizeText(bill?.kategoriTransaksi) === candidate.categoryKey
    && normalizeText(bill?.akunBank) === candidate.accountKey
}

/**
 * Stable fingerprint for a single ledger transaction, matching the candidate
 * fingerprints produced by findRecurringExpenses. Null when the transaction
 * lacks a normalizable description or category.
 */
export function buildExpenseFingerprint({ description, category, account } = {}) {
  const descriptionKey = normalizeText(description)
  const categoryKey = normalizeText(category)
  const accountKey = normalizeText(account)
  if (!descriptionKey || !categoryKey) return null
  return createFingerprint(`${descriptionKey}|${categoryKey}|${accountKey}`)
}

export function findRecurringExpenses({ transactions = [], bills = [], dismissedFingerprints = [], now = new Date() }) {
  const current = getWibDateParts(now)
  if (!current) return []
  const currentSerial = monthSerial(current.year, current.monthIndex)
  const firstSerial = currentSerial - WINDOW_MONTHS + 1
  const dismissed = new Set((dismissedFingerprints || []).filter(Boolean))
  const groups = new Map()

  for (const transaction of transactions || []) {
    if (!transaction || transaction.type !== "expense" || isSpecialExpense(transaction)) continue
    if (transaction.eventId || transaction.eventSubKategori) continue
    const description = String(transaction.desc || "").trim()
    const descriptionKey = normalizeText(description)
    const categoryKey = normalizeText(transaction.category)
    const accountKey = normalizeText(transaction.account)
    const amount = Number(transaction.amount)
    const date = ledgerDateParts(transaction.date)
    if (!descriptionKey || !categoryKey || !date || !Number.isFinite(amount) || amount <= 0) continue

    const serial = monthSerial(date.year, date.monthIndex)
    if (serial < firstSerial || serial > currentSerial) continue
    const key = `${descriptionKey}|${categoryKey}|${accountKey}`
    const group = groups.get(key) || { description, category: transaction.category, account: transaction.account || "", months: new Map() }
    const month = group.months.get(serial) || []
    month.push({ amount, day: date.day, date: transaction.date, order: serial * 31 + date.day })
    group.months.set(serial, month)
    groups.set(key, group)
  }

  const candidates = []
  for (const [key, group] of groups) {
    if (group.months.size < 3) continue
    const values = [...group.months.values()].flat()
    const medianAmount = median(values.map(item => item.amount))
    if (!Number.isFinite(medianAmount) || medianAmount <= 0) continue
    const maxDeviation = Math.max(...values.map(item => Math.abs(item.amount - medianAmount) / medianAmount))
    if (maxDeviation > MAX_DEVIATION) continue
    const typicalDay = median(values.map(item => item.day))
    if (values.some(item => Math.abs(item.day - typicalDay) > MAX_DAY_SPREAD)) continue

    const categoryKey = normalizeText(group.category)
    const accountKey = normalizeText(group.account)
    const candidate = {
      fingerprint: createFingerprint(key),
      description: group.description,
      category: group.category,
      account: group.account,
      categoryKey,
      accountKey,
      monthCount: group.months.size,
      months: [...group.months.keys()].sort((a, b) => a - b),
      transactionCount: values.length,
      medianAmount: Math.round(medianAmount),
      typicalDay,
      maxDeviation,
      latestDate: values.sort((a, b) => b.order - a.order)[0].date,
    }
    if (dismissed.has(candidate.fingerprint) || dismissed.has(`recurring:v1:${key}`)) continue
    // Only active bills suppress a candidate: deleting or disabling the bill
    // restores the stream so it can be scheduled again.
    const aktifBills = (bills || []).filter(bill => bill && bill.aktif !== false)
    const fingerprintKeys = [candidate.fingerprint, `recurring:v1:${key}`]
    if (aktifBills.some(bill => fingerprintKeys.includes(String(bill.sourceFingerprint || "").trim()))) continue
    if (aktifBills.some(bill => matchesBill(candidate, bill))) continue
    // A name match with different category or account is ambiguous: surface it
    // for review instead of silently dropping the candidate.
    const needsReview = aktifBills.some(bill => billNameMatches(candidate, bill))
    candidates.push(needsReview ? { ...candidate, needsReview: true } : candidate)
  }

  return candidates
    .sort((a, b) => b.monthCount - a.monthCount || a.maxDeviation - b.maxDeviation || String(a.fingerprint).localeCompare(String(b.fingerprint)))
    .slice(0, 3)
    .map(({ categoryKey, accountKey, ...candidate }) => candidate)
}
