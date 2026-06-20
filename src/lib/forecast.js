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

function getMonthLabel(entry) {
  return entry.year ? `${entry.month} ${entry.year}` : entry.month
}

function getNextMonth(currentMonth, currentYear) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  const idx = MONTHS.indexOf(currentMonth)
  if (idx === -1) return { month: currentMonth, year: currentYear }
  const nextIdx = (idx + 1) % 12
  const nextYear = nextIdx === 0 ? String(Number(currentYear) + 1) : currentYear
  return { month: MONTHS[nextIdx], year: nextYear }
}

/**
 * Compute cash flow forecast from monthly data.
 *
 * @param {Array} monthlyData — from /api/dashboard, sorted chronologically
 *   Each: { month: string, year: string, pemasukan: number, pengeluaran: number, surplus: number, tabungan: number }
 * @returns {Object}
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
      const next = getNextMonth(m.month, m.year)
      return {
        ...empty,
        insufficientData: false,
        projectionMonth: getMonthLabel({ month: next.month, year: next.year }),
        monthsUsed: 1,
        chartData: [
          {
            label: getMonthLabel(m),
            pemasukan: m.pemasukan,
            pengeluaran: m.pengeluaran,
            surplus: m.surplus,
            tabungan: m.tabungan || 0,
            surplusActual: m.surplus,
            surplusProjected: null,
            surplusLow: null,
            surplusHigh: null,
            isProjected: false,
          },
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
  const next = getNextMonth(lastMonth.month, lastMonth.year)
  const projectionMonth = getMonthLabel({ month: next.month, year: next.year })

  const chartData = [
    ...monthlyData.slice(-6).map((d) => ({
      label: getMonthLabel(d),
      pemasukan: d.pemasukan,
      pengeluaran: d.pengeluaran,
      surplus: d.surplus,
      tabungan: d.tabungan || 0,
      surplusActual: d.surplus,
      surplusProjected: null,
      surplusLow: null,
      surplusHigh: null,
      isProjected: false,
    })),
    {
      label: projectionMonth,
      pemasukan: Math.round(avgIncome),
      pengeluaran: Math.round(avgExpense),
      surplus: Math.round(projectedSurplus),
      tabungan: Math.round(avgSavings),
      surplusActual: null,
      surplusProjected: Math.round(projectedSurplus),
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
