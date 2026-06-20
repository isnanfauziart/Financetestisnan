import { computeGoalProgress } from "@/app/dashboard/_components/goalUtils"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"

function safeDiv(a, b, fallback = 0) {
  if (!b || !isFinite(b)) return fallback
  const result = a / b
  return isFinite(result) ? result : fallback
}

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

function computeSavingsRateScore(monthlyData) {
  if (!monthlyData || monthlyData.length === 0) return 0
  const rates = monthlyData
    .filter((m) => m.pemasukan > 0)
    .map((m) => ((m.pemasukan - m.pengeluaran) / m.pemasukan) * 100)
  if (rates.length === 0) return 0
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
      const key = `${m.month} ${m.year || ""}`
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
  if (!budgets || budgets.length === 0) return 50

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

function computeGoalProgressScore(goals, transactions) {
  if (!goals || goals.length === 0) return 50

  let totalPct = 0
  let count = 0
  for (const goal of goals) {
    if (!goal.target || goal.target <= 0) continue
    const sum = computeGoalProgress(goal, transactions || [])
    const pct = clamp((sum / goal.target) * 100, 0, 100)
    totalPct += pct
    count++
  }

  return count > 0 ? totalPct / count : 50
}

function computeIncomeStabilityScore(monthlyData) {
  const incomes = (monthlyData || [])
    .map((m) => m.pemasukan)
    .filter((v) => v > 0)
  if (incomes.length < 2) return 50

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
 * @param {Object} params
 * @param {Array}  params.transactions  — all transactions from /api/dashboard
 * @param {Array}  params.monthlyData   — monthlyData from /api/dashboard
 * @param {Array}  params.budgets       — budgets from /api/budgets
 * @param {Array}  params.goals         — goals from /api/goals
 * @returns {{ score: number, grade: string, delta: number, components: Array }}
 */
export function computeHealthScore({ transactions, monthlyData, budgets, goals }) {
  const components = [
    {
      key: "savings_rate",
      label: "Savings Rate",
      score: clamp(computeSavingsRateScore(monthlyData), 0, 100),
      weight: 0.30,
      detail: "",
      icon: "PiggyBank",
    },
    {
      key: "emergency_fund",
      label: "Emergency Fund",
      score: clamp(computeEmergencyFundScore(transactions, monthlyData), 0, 100),
      weight: 0.25,
      detail: "",
      icon: "Shield",
    },
    {
      key: "budget_adherence",
      label: "Budget Adherence",
      score: clamp(computeBudgetAdherenceScore(budgets, transactions), 0, 100),
      weight: 0.20,
      detail: "",
      icon: "Target",
    },
    {
      key: "goal_progress",
      label: "Goal Progress",
      score: clamp(computeGoalProgressScore(goals, transactions), 0, 100),
      weight: 0.15,
      detail: "",
      icon: "Crosshair",
    },
    {
      key: "income_stability",
      label: "Income Stability",
      score: clamp(computeIncomeStabilityScore(monthlyData), 0, 100),
      weight: 0.10,
      detail: "",
      icon: "TrendingUp",
    },
  ]

  // Redistribute weights if any component has no data
  const activeWeight = components.reduce((s, c) => s + (c.score !== null ? c.weight : 0), 0)
  if (activeWeight > 0 && activeWeight < 1) {
    const scale = 1 / activeWeight
    for (const c of components) {
      c.weight = c.weight * scale
    }
  }

  // Weighted score
  const score = Math.round(
    components.reduce((s, c) => s + c.score * c.weight, 0)
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
      case "goal_progress": {
        if (!goals || goals.length === 0) { c.detail = "Belum ada goals"; break }
        const done = goals.filter((g) => {
          if (!g.target || g.target <= 0) return false
          const sum = computeGoalProgress(g, transactions || [])
          return (sum / g.target) * 100 >= 100
        }).length
        c.detail = `${done}/${goals.length} selesai`
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
    const prevScore = Math.round(
      computeSavingsRateScore(prev) * 0.30 +
      computeEmergencyFundScore(transactions, prev) * 0.25 +
      computeBudgetAdherenceScore(budgets, transactions) * 0.20 +
      computeGoalProgressScore(goals, transactions) * 0.15 +
      computeIncomeStabilityScore(prev) * 0.10
    )
    delta = score - prevScore
  }

  return { score, grade, gradeColor, gradeDesc, delta, components }
}
