const WIB_TIME_ZONE = "Asia/Jakarta"
const OBSERVATION_WINDOW = 12
const MINIMUM_MONTHS = 2
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const MONTH_INDEX = Object.fromEntries(MONTHS.map((month, index) => [month, index]))
MONTH_INDEX.Ags = 7

const WIB_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: WIB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

function getDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getWibParts(value) {
  const date = getDate(value)
  if (!date) return null
  const parts = Object.fromEntries(
    WIB_DATE_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  )
  return parts
}

function getMonthIndex(month) {
  return MONTH_INDEX[String(month || "").trim()] ?? -1
}

function getRowMonth(row) {
  const monthIndex = getMonthIndex(row?.month)
  const year = Number(row?.year)
  if (!Number.isInteger(year) || year < 1 || monthIndex < 0) return null
  return {
    ...row,
    month: MONTHS[monthIndex],
    year: String(year),
    monthIndex,
    key: year * 12 + monthIndex,
  }
}

function getWibMonthKey(value) {
  const parts = getWibParts(value)
  return parts ? parts.year * 12 + (parts.month - 1) : null
}

function formatMonthLabel(year, monthIndex) {
  return `${MONTHS[monthIndex]} ${year}`
}

function formatDateLabel(value) {
  const parts = getWibParts(value)
  return parts ? formatMonthLabel(parts.year, parts.month - 1) : "—"
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeMoney(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeNetWorth(value) {
  if (typeof value !== "number" && typeof value !== "string") return null
  if (typeof value === "string" && value.trim() === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeOverride(value) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 && number <= 999_999_999_999 ? number : null
}

/**
 * Return the most recent completed WIB months that contain actual expenses.
 * Months absent from monthlyData are intentionally not synthesized.
 */
export function getCompletedExpenseMonths(monthlyData = [], now = new Date()) {
  const currentMonthKey = getWibMonthKey(now)
  if (currentMonthKey === null) return []

  const uniqueMonths = new Map()
  for (const rawRow of Array.isArray(monthlyData) ? monthlyData : []) {
    const row = getRowMonth(rawRow)
    if (!row || row.key >= currentMonthKey || normalizeMoney(row.pengeluaran) <= 0) continue
    uniqueMonths.set(row.key, row)
  }

  return Array.from(uniqueMonths.values())
    .sort((a, b) => a.key - b.key)
    .slice(-OBSERVATION_WINDOW)
}

/**
 * Add calendar months in the WIB calendar and clamp dates such as 31 January
 * to the last day of the destination month.
 */
export function addWibMonthsClamped(value, months) {
  const parts = getWibParts(value)
  if (!parts || !Number.isFinite(months)) return null

  const wholeMonths = Math.trunc(months)
  const targetMonth = parts.month - 1 + wholeMonths
  const targetYear = parts.year + Math.floor(targetMonth / 12)
  const targetMonthIndex = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate()
  const targetDay = Math.min(parts.day, lastDay)

  return new Date(Date.UTC(targetYear, targetMonthIndex, targetDay))
}

function getHistoryPoints(netWorthHistory, currentNetWorth, now) {
  const unique = new Map()
  for (const rawPoint of Array.isArray(netWorthHistory) ? netWorthHistory : []) {
    const month = getRowMonth(rawPoint)
    const value = normalizeNetWorth(rawPoint?.value)
    if (!month || value === null) continue
    unique.set(month.key, {
      key: month.key,
      label: formatMonthLabel(month.year, month.monthIndex),
      actual: value,
      projected: null,
    })
  }

  const points = Array.from(unique.values()).sort((a, b) => a.key - b.key).slice(-5)
  const currentValue = normalizeNetWorth(currentNetWorth)
  const currentKey = getWibMonthKey(now)
  if (currentValue !== null && currentKey !== null) {
    const currentPoint = {
      key: currentKey,
      label: "Sekarang",
      actual: currentValue,
      projected: null,
    }
    const existingIndex = points.findIndex((point) => point.key === currentKey)
    if (existingIndex >= 0) points[existingIndex] = currentPoint
    else points.push(currentPoint)
  }
  return points
}

export function buildProjectionData({
  netWorthHistory = [],
  currentNetWorth,
  target,
  monthsToFreedom,
  now = new Date(),
}) {
  const points = getHistoryPoints(netWorthHistory, currentNetWorth, now)
  if (!Number.isFinite(target) || monthsToFreedom === null || monthsToFreedom === undefined) return points

  const currentValue = normalizeNetWorth(currentNetWorth)
  const currentKey = getWibMonthKey(now)
  const wholeMonths = Math.max(0, Math.ceil(monthsToFreedom))
  const estimatedDate = addWibMonthsClamped(now, wholeMonths)
  const last = points.at(-1)
  if (currentValue === null || currentKey === null || !last || !estimatedDate) return points

  const anchoredPoints = points.map((point, index) => index === points.length - 1
    ? { ...point, projected: currentValue }
    : point)

  if (wholeMonths === 0) return anchoredPoints

  const projectedPoint = {
    key: currentKey + wholeMonths,
    label: formatDateLabel(estimatedDate),
    actual: null,
    projected: target,
  }

  return [...anchoredPoints, projectedPoint]
}

/**
 * Calculate the target and time estimate from one shared completed-month set.
 */
export function calculateFinancialFreedom({
  monthlyData = [],
  netWorth,
  netWorthHistory = [],
  monthlyExpenseOverride = null,
  now = new Date(),
}) {
  const months = getCompletedExpenseMonths(monthlyData, now)
  const currentNetWorth = normalizeNetWorth(netWorth)
  const override = normalizeOverride(monthlyExpenseOverride)
  const base = {
    status: "insufficient-data",
    months,
    monthCount: months.length,
    actualMonthlyExpense: null,
    averageMonthlyIncome: null,
    averageMonthlySurplus: null,
    monthlyExpense: override,
    expenseBasis: override ? "custom" : "actual",
    target: null,
    currentNetWorth: Number.isFinite(currentNetWorth) ? currentNetWorth : null,
    progress: null,
    remaining: null,
    monthsToFreedom: null,
    estimatedDate: null,
    projectionData: [],
  }

  if (months.length < MINIMUM_MONTHS) return base
  if (currentNetWorth === null) return { ...base, status: "invalid-net-worth" }

  const actualMonthlyExpense = months.reduce((sum, month) => sum + normalizeMoney(month.pengeluaran), 0) / months.length
  const averageMonthlyIncome = months.reduce((sum, month) => sum + normalizeMoney(month.pemasukan), 0) / months.length
  const averageMonthlySurplus = averageMonthlyIncome - actualMonthlyExpense
  const monthlyExpense = override || actualMonthlyExpense
  const target = Math.round(monthlyExpense * 12 * 25)
  const remaining = Math.max(0, target - currentNetWorth)
  const progress = clamp((currentNetWorth / target) * 100, 0, 100)
  const hasPositiveSurplus = averageMonthlySurplus > 0
  const monthsToFreedom = remaining === 0 ? 0 : hasPositiveSurplus ? remaining / averageMonthlySurplus : null
  const estimatedDate = monthsToFreedom === null ? null : addWibMonthsClamped(now, Math.ceil(monthsToFreedom))
  const status = remaining > 0 && !hasPositiveSurplus ? "non-positive-surplus" : "ready"

  return {
    status,
    months,
    monthCount: months.length,
    actualMonthlyExpense,
    averageMonthlyIncome,
    averageMonthlySurplus,
    monthlyExpense,
    expenseBasis: override ? "custom" : "actual",
    target,
    currentNetWorth,
    progress,
    remaining,
    monthsToFreedom,
    estimatedDate,
    projectionData: buildProjectionData({
      netWorthHistory,
      currentNetWorth,
      target,
      monthsToFreedom,
      now,
    }),
  }
}
