/**
 * Wave 6 — shared anomaly rules.
 *
 * Extracted unchanged from `AnomalyAlerts` so the Beranda checklist and the
 * Statistik surface answer "is there unusual spending?" with the exact same
 * deterministic rules: routine expenses only, compared against the previous
 * three months' category average, flagged at ratio >= 1.3, worst first.
 */

import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { isSpecialExpense } from "@/lib/expenseClass"

export function getPrevMonths(month, year, count) {
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx < 0) return []
  const result = []
  let m = idx
  let y = parseInt(year, 10)
  for (let i = 0; i < count; i++) {
    m--
    if (m < 0) { m = 11; y-- }
    result.push({ month: AVAILABLE_MONTHS[m], year: String(y) })
  }
  return result
}

export function getDaysInMonth(month, year) {
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx < 0) return 30
  return new Date(parseInt(year, 10), idx + 1, 0).getDate()
}

export function getCurrentDayInMonth(month, year, now = new Date()) {
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx < 0) return 30
  if (parseInt(year, 10) !== now.getFullYear() || idx !== now.getMonth()) {
    return getDaysInMonth(month, year)
  }
  return now.getDate()
}

/**
 * Detect anomalous routine spending for one month.
 *
 * @param {object} input
 * @param {Array}  input.transactions All transactions (any month).
 * @param {string} input.month        Target month (e.g. "Jul").
 * @param {string} input.year         Target year (e.g. "2026").
 * @param {Date}   [input.now]        Clock for month-progress math (tests inject).
 * @returns {Array} Sorted worst-first anomaly records.
 */
export function detectAnomalies({ transactions, month, year, now = new Date() }) {
  if (!transactions || transactions.length === 0) return []
  if (!month || month === "Semua Bulan") return []
  if (!year || year === "Semua Tahun") return []

  const prevMonths = getPrevMonths(month, year, 3)
  if (prevMonths.length === 0) return []

  const currentSpend = {}
  const prevSpendByMonth = {}

  for (const t of transactions) {
    if (t.type !== "expense") continue
    if (isSpecialExpense(t)) continue
    const key = `${t.month} ${t.year}`
    const isCurrent = t.month === month && t.year === year
    if (isCurrent) {
      currentSpend[t.category] = (currentSpend[t.category] || 0) + t.amount
    } else {
      for (const pm of prevMonths) {
        if (t.month === pm.month && t.year === pm.year) {
          if (!prevSpendByMonth[t.category]) prevSpendByMonth[t.category] = {}
          prevSpendByMonth[t.category][key] = (prevSpendByMonth[t.category][key] || 0) + t.amount
        }
      }
    }
  }

  const results = []
  const daysInCurrent = getDaysInMonth(month, year)
  const currentDay = getCurrentDayInMonth(month, year, now)
  const monthProgress = currentDay / daysInCurrent

  for (const [cat, current] of Object.entries(currentSpend)) {
    if (current <= 0) continue

    const prevMonthsData = prevSpendByMonth[cat] || {}
    const prevValues = Object.values(prevMonthsData)
    if (prevValues.length === 0) continue

    const avg = prevValues.reduce((s, v) => s + v, 0) / prevValues.length
    if (avg <= 0) continue

    const ratio = current / avg
    if (ratio < 1.3) continue

    const projectedAtCurrentRate = monthProgress > 0 ? current / monthProgress : current
    const projectedRatio = projectedAtCurrentRate / avg

    results.push({
      category: cat,
      current,
      avg: Math.round(avg),
      ratio,
      delta: ((ratio - 1) * 100).toFixed(0),
      projectedAtCurrentRate: Math.round(projectedAtCurrentRate),
      projectedDelta: ((projectedRatio - 1) * 100).toFixed(0),
      monthProgress: Math.round(monthProgress * 100),
      prevMonthsCount: prevValues.length,
      severity: ratio >= 2 ? "critical" : ratio >= 1.5 ? "high" : "medium",
    })
  }

  return results.sort((a, b) => b.ratio - a.ratio)
}
