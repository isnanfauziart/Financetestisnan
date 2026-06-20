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

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

// --- Component scores (return null when data is insufficient → excluded from calculation) ---

function computeSavingsRateScore(monthlyData) {
  if (!monthlyData || monthlyData.length === 0) return null
  const rates = monthlyData
    .filter((m) => m.pemasukan > 0)
    .map((m) => ((m.pemasukan - m.pengeluaran) / m.pemasukan) * 100)
  if (rates.length === 0) return null
  const avgRate = safeAvg(rates)
  if (avgRate < 0) return 0
  if (avgRate >= 20) return 100
  if (avgRate >= 10) return 50 + ((avgRate - 10) / 10) * 50
  return (avgRate / 10) * 50
}

function computeEmergencyFundScore(transactions, monthlyData) {
  const liquidCategories = ["Tabungan Cash", "Emas"]
  let totalLiquid = 0
  for (const t of transactions || []) {
    if (t.type === "savings" && liquidCategories.includes(t.category)) {
      totalLiquid += t.amount
    }
  }
  if (totalLiquid === 0) return 0

  const expensesByMonth = {}
  for (const m of monthlyData || []) {
    if (m.pengeluaran > 0) {
      const key = m.year ? `${m.month} ${m.year}` : m.month
      expensesByMonth[key] = m.pengeluaran
    }
  }
  const monthValues = Object.values(expensesByMonth)
  const avgMonthlyExpense = safeAvg(monthValues)
  if (avgMonthlyExpense === 0) return 0

  const months = totalLiquid / avgMonthlyExpense
  if (months >= 6) return 100
  return (months / 6) * 100
}

function computeBudgetAdherenceScore(budgets, transactions) {
  if (!budgets || budgets.length === 0) return null

  const spentByCategory = {}
  for (const t of transactions || []) {
    if (t.type !== "expense") continue
    spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount
  }

  let underCount = 0
  for (const b of budgets) {
    const spent = spentByCategory[b.kategori] || 0
    if (spent <= (b.limit || 0)) underCount++
  }

  return (underCount / budgets.length) * 100
}

/**
 * Expense Trend Score — linear regression slope of last 6 months' expenses.
 * Negative slope (expenses decreasing) → high score.
 * Positive slope (expenses increasing) → low score.
 * Returns null if < 2 data points.
 */
function computeExpenseTrendScore(monthlyData) {
  if (!monthlyData || monthlyData.length < 2) return null
  const recent = monthlyData.slice(-6)
  const expenses = recent.map((d) => d.pengeluaran || 0)
  if (expenses.length < 2) return null

  // Simple linear regression: y = a + b*x
  const n = expenses.length
  const xMean = (n - 1) / 2
  const yMean = safeAvg(expenses)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (expenses[i] - yMean)
    den += (i - xMean) * (i - xMean)
  }
  const slope = den !== 0 ? num / den : 0

  // Normalize slope relative to mean expense
  const relSlope = yMean > 0 ? slope / yMean : 0

  // relSlope < 0 → expenses decreasing → good (high score)
  // relSlope = 0 → flat → neutral (50)
  // relSlope > 0 → expenses increasing → bad (low score)
  if (relSlope <= -0.1) return 100
  if (relSlope <= -0.05) return 80
  if (relSlope <= 0) return 60
  if (relSlope <= 0.05) return 40
  if (relSlope <= 0.1) return 20
  return 10
}

function computeIncomeStabilityScore(monthlyData) {
  const incomes = (monthlyData || [])
    .map((m) => m.pemasukan)
    .filter((v) => v > 0)
  if (incomes.length < 2) return null

  const mean = safeAvg(incomes)
  if (mean === 0) return 0
  const cv = safeStddev(incomes) / mean
  if (cv < 0.1) return 100
  if (cv < 0.3) return 70
  if (cv < 0.5) return 40
  return 15
}

/**
 * Compute the Financial Health Score from dashboard data.
 *
 * Components:
 * - Savings Rate (30%) — avg (income − expense) / income
 * - Emergency Fund (25%) — liquid savings / avg monthly expense (target 6 months)
 * - Budget Adherence (20%) — % of budgets under limit (excluded if no budgets)
 * - Expense Trend (15%) — linear regression slope of monthly expenses (excluded if < 2 months)
 * - Income Stability (10%) — coefficient of variation of income (excluded if < 2 months)
 *
 * When a component returns null (no data), its weight is redistributed proportionally.
 *
 * @param {Object} params
 * @param {Array}  params.transactions — all transactions from /api/dashboard
 * @param {Array}  params.monthlyData  — monthlyData from /api/dashboard (year-aware)
 * @param {Array}  params.budgets      — budgets from /api/budgets
 * @returns {{ score: number, grade: string, delta: number, components: Array }}
 */
export function computeHealthScore({ transactions, monthlyData, budgets }) {
  const components = [
    {
      key: "savings_rate",
      label: "Savings Rate",
      baseWeight: 0.30,
      icon: "PiggyBank",
    },
    {
      key: "emergency_fund",
      label: "Emergency Fund",
      baseWeight: 0.25,
      icon: "Shield",
    },
    {
      key: "budget_adherence",
      label: "Budget Adherence",
      baseWeight: 0.20,
      icon: "Target",
    },
    {
      key: "expense_trend",
      label: "Expense Trend",
      baseWeight: 0.15,
      icon: "TrendingDown",
    },
    {
      key: "income_stability",
      label: "Income Stability",
      baseWeight: 0.10,
      icon: "TrendingUp",
    },
  ]

  // Compute raw scores
  for (const c of components) {
    switch (c.key) {
      case "savings_rate":
        c.rawScore = computeSavingsRateScore(monthlyData)
        break
      case "emergency_fund":
        c.rawScore = computeEmergencyFundScore(transactions, monthlyData)
        break
      case "budget_adherence":
        c.rawScore = computeBudgetAdherenceScore(budgets, transactions)
        break
      case "expense_trend":
        c.rawScore = computeExpenseTrendScore(monthlyData)
        break
      case "income_stability":
        c.rawScore = computeIncomeStabilityScore(monthlyData)
        break
    }
  }

  // Separate active (has data) vs excluded (null)
  const active = components.filter((c) => c.rawScore !== null)
  const excluded = components.filter((c) => c.rawScore === null)

  // Redistribute weights among active components
  const activeWeightSum = active.reduce((s, c) => s + c.baseWeight, 0)
  for (const c of components) {
    if (c.rawScore === null) {
      c.score = null
      c.weight = 0
    } else {
      c.score = clamp(c.rawScore, 0, 100)
      c.weight = activeWeightSum > 0 ? (c.baseWeight / activeWeightSum) : 0
    }
  }

  // Weighted score (only from active components)
  const score = Math.round(
    active.reduce((s, c) => s + c.score * c.weight, 0)
  )

  // Grade
  let grade, gradeColor, gradeDesc
  if (score >= 80) { grade = "A"; gradeColor = "#7c8c5a"; gradeDesc = "Sangat Baik" }
  else if (score >= 65) { grade = "B"; gradeColor = "#5b8c7a"; gradeDesc = "Baik" }
  else if (score >= 50) { grade = "C"; gradeColor = "#d4a853"; gradeDesc = "Cukup" }
  else if (score >= 35) { grade = "D"; gradeColor = "#c47d5a"; gradeDesc = "Kurang" }
  else { grade = "F"; gradeColor = "#c44545"; gradeDesc = "Perlu Perbaikan" }

  // Build detail strings
  for (const c of components) {
    if (c.score === null) {
      c.detail = "Tidak aktif"
      continue
    }
    switch (c.key) {
      case "savings_rate": {
        const incomes = (monthlyData || []).filter((m) => m.pemasukan > 0)
        const avgRate = incomes.length > 0
          ? safeAvg(incomes.map((m) => ((m.pemasukan - m.pengeluaran) / m.pemasukan) * 100))
          : 0
        c.detail = avgRate >= 0 ? `${avgRate.toFixed(0)}% dari income` : "Defisit"
        break
      }
      case "emergency_fund": {
        const liquidCategories = ["Tabungan Cash", "Emas"]
        let totalLiquid = 0
        for (const t of transactions || []) {
          if (t.type === "savings" && liquidCategories.includes(t.category)) totalLiquid += t.amount
        }
        const expensesByMonth = (monthlyData || []).filter((m) => m.pengeluaran > 0).map((m) => m.pengeluaran)
        const avgExp = safeAvg(expensesByMonth)
        const months = avgExp > 0 ? totalLiquid / avgExp : 0
        c.detail = `${months.toFixed(1)} bulan cadangan`
        break
      }
      case "budget_adherence": {
        if (!budgets || budgets.length === 0) { c.detail = "Belum ada budget"; break }
        const spentByCategory = {}
        for (const t of transactions || []) {
          if (t.type === "expense") spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount
        }
        const under = budgets.filter((b) => (spentByCategory[b.kategori] || 0) <= (b.limit || 0)).length
        c.detail = `${under}/${budgets.length} on-track`
        break
      }
      case "expense_trend": {
        const recent = (monthlyData || []).slice(-6)
        const expenses = recent.map((d) => d.pengeluaran || 0)
        if (expenses.length < 2) { c.detail = "Data kurang"; break }
        const n = expenses.length
        const xMean = (n - 1) / 2
        const yMean = safeAvg(expenses)
        let num = 0, den = 0
        for (let i = 0; i < n; i++) {
          num += (i - xMean) * (expenses[i] - yMean)
          den += (i - xMean) * (i - xMean)
        }
        const slope = den !== 0 ? num / den : 0
        const pctChange = yMean > 0 ? (slope / yMean) * 100 : 0
        if (pctChange <= 0) {
          c.detail = `Turun ${Math.abs(pctChange).toFixed(0)}%/bln`
        } else {
          c.detail = `Naik ${pctChange.toFixed(0)}%/bln`
        }
        break
      }
      case "income_stability": {
        const incomes = (monthlyData || []).map((m) => m.pemasukan).filter((v) => v > 0)
        if (incomes.length < 2) { c.detail = "Data kurang"; break }
        const mean = safeAvg(incomes)
        const cv = mean > 0 ? (safeStddev(incomes) / mean) * 100 : 0
        c.detail = `\u00b1${cv.toFixed(0)}% variasi`
        break
      }
    }
  }

  // Compute delta vs previous period (if enough data)
  let delta = 0
  if (monthlyData && monthlyData.length >= 2) {
    const prev = monthlyData.slice(0, -1)
    const prevResult = computeHealthScore({ transactions, monthlyData: prev, budgets })
    delta = score - prevResult.score
  }

  return { score, grade, gradeColor, gradeDesc, delta, components }
}
