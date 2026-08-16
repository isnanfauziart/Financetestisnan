import { AVAILABLE_MONTHS } from "./constants"

export function buildMonthlyCashFlowData(transactions = []) {
  const monthly = new Map()

  for (const transaction of transactions) {
    if (!transaction || !["income", "expense"].includes(transaction.type)) continue

    const monthIndex = AVAILABLE_MONTHS.indexOf(transaction.month)
    const year = String(transaction.year || "")
    if (monthIndex < 0 || !year) continue

    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`
    const row = monthly.get(key) || {
      month: transaction.month,
      year,
      pemasukan: 0,
      pengeluaran: 0,
    }
    const amount = Number(transaction.amount) || 0

    if (transaction.type === "income") row.pemasukan += amount
    if (transaction.type === "expense") row.pengeluaran += amount
    monthly.set(key, row)
  }

  const rows = Array.from(monthly.entries())
    .filter(([, row]) => row.pemasukan > 0 || row.pengeluaran > 0)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, row]) => row)

  return rows.map((row, index) => {
    const windowRows = rows.slice(Math.max(0, index - 2), index + 1)
    return {
      ...row,
      rataRataPemasukan: windowRows.reduce((total, item) => total + item.pemasukan, 0) / windowRows.length,
      rataRataPengeluaran: windowRows.reduce((total, item) => total + item.pengeluaran, 0) / windowRows.length,
    }
  })
}

export function getStatsPeriodDefaults(now = new Date()) {
  const currentMonthIndex = now.getMonth()
  const currentYear = String(now.getFullYear())
  const previousMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1
  const previousYear = currentMonthIndex === 0 ? String(now.getFullYear() - 1) : currentYear

  return {
    selectedMonth: AVAILABLE_MONTHS[currentMonthIndex],
    selectedYear: currentYear,
    compareMonthA: AVAILABLE_MONTHS[currentMonthIndex],
    compareYearA: currentYear,
    compareMonthB: AVAILABLE_MONTHS[previousMonthIndex],
    compareYearB: previousYear,
  }
}

export function getComparePeriodOptions(availableYears, { currentYear, previousYear }) {
  return Array.from(new Set([...(availableYears || []), currentYear, previousYear].filter(Boolean))).sort((a, b) => b.localeCompare(a))
}

export function getCompareSeriesLabels(compareMonthA, compareYearA, compareMonthB, compareYearB) {
  return {
    compareLabelA: `${compareMonthA} ${compareYearA}`,
    compareLabelB: `${compareMonthB} ${compareYearB}`,
  }
}
