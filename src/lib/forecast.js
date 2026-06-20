import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"

function safeAvg(arr) {
  if (!arr || arr.length === 0) return 0
  const sum = arr.reduce((s, v) => s + (isFinite(v) ? v : 0), 0)
  return sum / arr.length
}

function safeStddev(arr) {
  if (arr.length < 2) return 0
  const mean = safeAvg(arr)
  const variance = safeAvg(arr.map((v) => Math.pow((isFinite(v) ? v : 0) - mean, 2)))
  return Math.sqrt(variance)
}

/**
 * Compute cash flow forecast from monthly data.
 *
 * @param {Array} monthlyData — from /api/dashboard, sorted chronologically
 *   Each: { month: string, pemasukan: number, pengeluaran: number, surplus: number, tabungan: number }
 * @returns {{
 *   projectedIncome: number,
 *   projectedExpense: number,
 *   projectedSurplus: number,
 *   projectedSavings: number,
 *   incomeStdDev: number,
 *   expenseStdDev: number,
 *   surplusStdDev: number,
 *   confidenceLow: number,
 *   confidenceHigh: number,
 *   projectionMonth: string,
 *   monthsUsed: number,
 *   insufficientData: boolean,
 *   chartData: Array<{
 *     month: string,
 *     pemasukan: number,
 *     pengeluaran: number,
 *     surplus: number,
 *     tabungan: number,
 *     surplusLow: number | null,
 *     surplusHigh: number | null,
 *     isProjected: boolean
 *   }>
 * }}
 */
export function computeForecast(monthlyData) {
  const empty = {
    projectedIncome: 0,
    projectedExpense: 0,
    projectedSurplus: 0,
    projectedSavings: 0,
    incomeStdDev: 0,
    expenseStdDev: 0,
    surplusStdDev: 0,
    confidenceLow: 0,
    confidenceHigh: 0,
    projectionMonth: "",
    monthsUsed: 0,
    insufficientData: true,
    chartData: [],
  }

  if (!monthlyData || monthlyData.length < 2) {
    if (monthlyData && monthlyData.length === 1) {
      const m = monthlyData[0]
      return {
        ...empty,
        insufficientData: false,
        projectionMonth: getNextMonth(m.month),
        monthsUsed: 1,
        chartData: [
          ...monthlyData.map((d) => ({
            month: d.month,
            pemasukan: d.pemasukan,
            pengeluaran: d.pengeluaran,
            surplus: d.surplus,
            tabungan: d.tabungan || 0,
            surplusLow: null,
            surplusHigh: null,
            isProjected: false,
          })),
        ],
      }
    }
    return empty
  }

  const recent = monthlyData.slice(-3)
  const incomes = recent.map((d) => d.pemasukan)
  const expenses = recent.map((d) => d.pengeluaran)
  const surpluses = recent.map((d) => d.surplus)
  const savings = recent.map((d) => d.tabungan || 0)

  const avgIncome = safeAvg(incomes)
  const avgExpense = safeAvg(expenses)
  const avgSurplus = safeAvg(surpluses)
  const avgSavings = safeAvg(savings)

  const stdSurplus = safeStddev(surpluses)

  const projectedSurplus = avgIncome - avgExpense
  const confidenceLow = projectedSurplus - 1.5 * stdSurplus
  const confidenceHigh = projectedSurplus + 1.5 * stdSurplus

  const lastMonth = monthlyData[monthlyData.length - 1]
  const projectionMonth = getNextMonth(lastMonth.month)

  const chartData = [
    ...monthlyData.slice(-6).map((d) => ({
      month: d.month,
      pemasukan: d.pemasukan,
      pengeluaran: d.pengeluaran,
      surplus: d.surplus,
      tabungan: d.tabungan || 0,
      surplusLow: null,
      surplusHigh: null,
      isProjected: false,
    })),
    {
      month: projectionMonth,
      pemasukan: Math.round(avgIncome),
      pengeluaran: Math.round(avgExpense),
      surplus: Math.round(projectedSurplus),
      tabungan: Math.round(avgSavings),
      surplusLow: Math.round(confidenceLow),
      surplusHigh: Math.round(confidenceHigh),
      isProjected: true,
    },
  ]

  return {
    projectedIncome: Math.round(avgIncome),
    projectedExpense: Math.round(avgExpense),
    projectedSurplus: Math.round(projectedSurplus),
    projectedSavings: Math.round(avgSavings),
    incomeStdDev: Math.round(safeStddev(incomes)),
    expenseStdDev: Math.round(safeStddev(expenses)),
    surplusStdDev: Math.round(stdSurplus),
    confidenceLow: Math.round(confidenceLow),
    confidenceHigh: Math.round(confidenceHigh),
    projectionMonth,
    monthsUsed: recent.length,
    insufficientData: false,
    chartData,
  }
}

function getNextMonth(currentMonth) {
  const idx = AVAILABLE_MONTHS.indexOf(currentMonth)
  if (idx === -1) return currentMonth
  return AVAILABLE_MONTHS[(idx + 1) % 12]
}
