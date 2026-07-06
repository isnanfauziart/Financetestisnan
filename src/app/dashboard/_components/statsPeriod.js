import { AVAILABLE_MONTHS } from "./constants"

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
