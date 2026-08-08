import { getBillOccurrencesInMonth } from "./bills"

const TIME_ZONE = "Asia/Jakarta"
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const MONTH_ALIASES = new Map([
  ["jan", 0], ["januari", 0], ["january", 0],
  ["feb", 1], ["februari", 1], ["february", 1],
  ["mar", 2], ["maret", 2], ["march", 2],
  ["apr", 3], ["april", 3],
  ["mei", 4], ["may", 4],
  ["jun", 5], ["juni", 5], ["june", 5],
  ["jul", 6], ["juli", 6], ["july", 6],
  ["agu", 7], ["ags", 7], ["agustus", 7], ["aug", 7], ["august", 7],
  ["sep", 8], ["sept", 8], ["september", 8],
  ["okt", 9], ["oktober", 9], ["oct", 9], ["october", 9],
  ["nov", 10], ["november", 10],
  ["des", 11], ["desember", 11], ["dec", 11], ["december", 11],
])

function toFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (value === null || value === undefined || String(value).trim() === "") return 0

  const direct = Number(value)
  if (Number.isFinite(direct)) return direct

  const normalized = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function monthKey(year, monthIndex) {
  return year * 12 + monthIndex
}

function monthParts(key) {
  const year = Math.floor(key / 12)
  return { year, monthIndex: key - year * 12 }
}

function formatMonth(key) {
  const { year, monthIndex } = monthParts(key)
  return `${MONTH_LABELS[monthIndex]} ${year}`
}

function parseMonthValue(value, year) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  const iso = /^(\d{4})[-/]?(\d{1,2})(?:[-/]\d{1,2})?$/.exec(text)
  if (iso) return monthKey(Number(iso[1]), Number(iso[2]) - 1)

  const numeric = Number(text)
  if (Number.isInteger(numeric) && Number.isInteger(Number(year))) {
    const monthIndex = numeric >= 1 && numeric <= 12 ? numeric - 1 : numeric
    if (monthIndex >= 0 && monthIndex < 12) return monthKey(Number(year), monthIndex)
  }

  const monthIndex = MONTH_ALIASES.get(text.toLowerCase())
  return monthIndex === undefined || !Number.isInteger(Number(year))
    ? null
    : monthKey(Number(year), monthIndex)
}

function monthKeyFromDate(value) {
  if (!value) return null
  const text = String(value).trim()
  const formatted = /^(?:\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text)
  if (formatted) return parseMonthValue(formatted[1], formatted[2])

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]))
  return monthKey(Number(parts.year), Number(parts.month) - 1)
}

function getWibMonth(value) {
  const date = value instanceof Date ? value : new Date(value)
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(safeDate).map((part) => [part.type, part.value]))
  return monthKey(Number(parts.year), Number(parts.month) - 1)
}

function readEntryMonth(entry) {
  return parseMonthValue(entry?.month, entry?.year) ?? monthKeyFromDate(entry?.date)
}

function readTransactionMonth(transaction) {
  return parseMonthValue(transaction?.month, transaction?.year)
    ?? monthKeyFromDate(transaction?.date ?? transaction?.tanggal)
}

function readTransactionId(transaction) {
  return String(transaction?.id ?? transaction?.ID ?? transaction?.transactionId ?? "").trim()
}

function readAmount(value) {
  const amount = toFiniteNumber(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function hasFiniteValue(value) {
  if (value === null || value === undefined || String(value).trim?.() === "") return false
  return Number.isFinite(Number(value))
}

function readRoutineExpense(entry) {
  return entry?.pengeluaranRutin ?? entry?.pengeluaran
}

function readRoutineSurplus(entry, income, expense) {
  if (hasFiniteValue(entry?.surplusRutin)) return toFiniteNumber(entry.surplusRutin)
  if (hasFiniteValue(entry?.surplus)) return toFiniteNumber(entry.surplus)
  return income - expense
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function standardDeviation(values) {
  if (!values.length) return 0
  const mean = average(values)
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
}

function weightedAverage(values) {
  const weightTotal = values.reduce((sum, _, index) => sum + index + 1, 0)
  return weightTotal ? values.reduce((sum, value, index) => sum + value * (index + 1), 0) / weightTotal : 0
}

function capWithTukeyFences(values) {
  if (values.length < 2) return values
  const sorted = [...values].sort((a, b) => a - b)
  const half = Math.floor(sorted.length / 2)
  const q1 = median(sorted.slice(0, half))
  const q3 = median(sorted.slice(sorted.length - half))
  const fence = 1.5 * (q3 - q1)
  const lower = q1 - fence
  const upper = q3 + fence
  return values.map((value) => Math.min(upper, Math.max(lower, value)))
}

function isActiveBill(bill) {
  const value = bill?.aktif ?? bill?.active
  if (value === undefined) return true
  return value === true || value === 1 || ["true", "1", "yes"].includes(String(value).trim().toLowerCase())
}

function billType(bill) {
  return String(bill?.tipe ?? bill?.type ?? "expense").trim().toLowerCase()
}

function getBillOccurrenceCount(bill, targetKey) {
  const { year, monthIndex } = monthParts(targetKey)
  return getBillOccurrencesInMonth(bill, year, monthIndex).length
}

function scheduledBillTotals(bills, targetKey) {
  let scheduledIncome = 0
  let scheduledExpense = 0

  for (const bill of Array.isArray(bills) ? bills : []) {
    if (!isActiveBill(bill)) continue
    const amount = readAmount(bill?.jumlah ?? bill?.amount)
    const occurrences = getBillOccurrenceCount(bill, targetKey)
    if (!amount || !occurrences) continue
    if (billType(bill) === "income") scheduledIncome += amount * occurrences
    else if (billType(bill) === "expense") scheduledExpense += amount * occurrences
  }

  return { scheduledIncome, scheduledExpense }
}

function emptyForecast(projectionMonth, monthsUsed, dataGapCount) {
  return {
    projectedIncome: null,
    projectedExpense: null,
    projectedSurplus: null,
    projectionMonth,
    monthsUsed,
    incomeProfile: "limited",
    incomeMethod: "median",
    variableIncomeBaseline: null,
    variableExpenseBaseline: null,
    scheduledIncome: 0,
    scheduledExpense: 0,
    dataGapCount,
    specialHistoryExcluded: false,
    specialHistoryExcludedCount: 0,
    insufficientData: true,
    chartData: [],
  }
}

/**
 * Compute a deterministic cash-flow forecast from complete observed months.
 *
 * @param {Array} monthlyData
 * @param {{transactions?: Array, bills?: Array, now?: Date}} options
 * @returns {Object}
 */
export function computeForecast(monthlyData, { transactions = [], bills = [], now = new Date() } = {}) {
  const currentKey = getWibMonth(now)
  const projectionKey = currentKey + 1
  const projectionMonth = formatMonth(projectionKey)
  const grouped = new Map()

  for (const entry of Array.isArray(monthlyData) ? monthlyData : []) {
    const key = readEntryMonth(entry)
    if (key === null || key >= currentKey) continue
    const existing = grouped.get(key) || {
      key,
      pemasukan: 0,
      pengeluaran: 0,
      surplus: 0,
      specialHistoryExcludedCount: 0,
    }
    const income = toFiniteNumber(entry?.pemasukan)
    const expense = toFiniteNumber(readRoutineExpense(entry))
    const actualExpense = toFiniteNumber(entry?.pengeluaran)
    existing.pemasukan += income
    existing.pengeluaran += expense
    existing.surplus += readRoutineSurplus(entry, income, expense)
    if (hasFiniteValue(entry?.pengeluaranRutin)) {
      existing.specialHistoryExcludedCount += 1
    }
    grouped.set(key, existing)
  }

  const observed = [...grouped.values()].sort((a, b) => a.key - b.key)
  const recent = observed.slice(-6)
  const specialHistoryExcludedCount = recent.reduce((sum, entry) => sum + entry.specialHistoryExcludedCount, 0)
  const dataGapCount = recent.length < 2
    ? 0
    : Math.max(0, recent[recent.length - 1].key - recent[0].key + 1 - recent.length)

  if (recent.length < 3) return emptyForecast(projectionMonth, recent.length, dataGapCount)

  const billPayByMonth = new Map()
  if (Array.isArray(transactions) && transactions.length) {
    for (const transaction of transactions) {
      if (!/^billpay:[^:]+:/i.test(readTransactionId(transaction))) continue
      const key = readTransactionMonth(transaction)
      if (key === null) continue
      const type = String(transaction?.type ?? transaction?.tipe ?? "").trim().toLowerCase()
      if (!(["income", "expense"].includes(type))) continue
      const amounts = billPayByMonth.get(key) || { income: 0, expense: 0 }
      amounts[type] += readAmount(transaction?.amount ?? transaction?.jumlah)
      billPayByMonth.set(key, amounts)
    }
  }

  const incomes = recent.map((entry) => Math.max(0, entry.pemasukan - (billPayByMonth.get(entry.key)?.income || 0)))
  const variableExpenses = recent.map((entry) => Math.max(0, entry.pengeluaran - (billPayByMonth.get(entry.key)?.expense || 0)))
  const incomeAverage = average(incomes)
  const incomeCv = incomeAverage > 0 ? standardDeviation(incomes) / incomeAverage : Infinity
  const stableIncome = recent.length === 6 && incomeCv <= 0.25
  const incomeProfile = recent.length < 6 ? "limited" : stableIncome ? "stable" : "irregular"
  const incomeMethod = stableIncome ? "weighted" : "median"
  const variableIncomeBaseline = stableIncome ? weightedAverage(incomes) : median(incomes)
  const variableExpenseBaseline = weightedAverage(capWithTukeyFences(variableExpenses))
  const { scheduledIncome, scheduledExpense } = scheduledBillTotals(bills, projectionKey)
  const projectedIncome = variableIncomeBaseline + scheduledIncome
  const projectedExpense = variableExpenseBaseline + scheduledExpense
  const projectedSurplus = projectedIncome - projectedExpense
  const chartData = recent.map((entry, index) => ({
    label: formatMonth(entry.key),
    pemasukan: entry.pemasukan,
    pengeluaran: entry.pengeluaran,
    surplus: entry.surplus,
    surplusActual: entry.surplus,
    surplusForecast: index === recent.length - 1 ? entry.surplus : null,
    isProjected: false,
  }))

  chartData.push({
    label: projectionMonth,
    pemasukan: projectedIncome,
    pengeluaran: projectedExpense,
    surplus: projectedSurplus,
    surplusActual: null,
    surplusForecast: projectedSurplus,
    isProjected: true,
  })

  return {
    projectedIncome,
    projectedExpense,
    projectedSurplus,
    projectionMonth,
    monthsUsed: recent.length,
    incomeProfile,
    incomeMethod,
    variableIncomeBaseline,
    variableExpenseBaseline,
    scheduledIncome,
    scheduledExpense,
    dataGapCount,
    specialHistoryExcluded: specialHistoryExcludedCount > 0,
    specialHistoryExcludedCount,
    insufficientData: false,
    chartData,
  }
}
