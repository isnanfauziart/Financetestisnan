/**
 * Financial Health Score — Skor Kesehatan Keuangan
 * 
 * 5 komponen: Savings Rate (30%), Emergency Fund (25%), 
 * Budget Adherence (20%), Goal Progress (15%), Net Worth Growth (10%)
 * 
 * Score range: 0-100
 * Grades: A (90+), B (75-89), C (60-74), D (40-59), F (<40)
 */

// ─── Grade helpers ───

export const GRADES = [
  { min: 90, label: "A", desc: "Sehat sekali", color: "#7c8c5a" },
  { min: 75, label: "B", desc: "Cukup sehat", color: "#5b8c7a" },
  { min: 60, label: "C", desc: "Perlu perhatian", color: "#d4a853" },
  { min: 40, label: "D", desc: "Kurang sehat", color: "#c47d5a" },
  { min: 0,  label: "F", desc: "Perlu perbaikan serius", color: "#c44545" },
]

export function getGrade(score) {
  for (const g of GRADES) {
    if (score >= g.min) return g
  }
  return GRADES[GRADES.length - 1]
}

// ─── Component 1: Savings Rate (30%) ───

function scoreSavingsRate(totalIncome, totalExpense) {
  if (totalIncome <= 0) return 0
  
  const rate = ((totalIncome - totalExpense) / totalIncome) * 100
  
  if (rate >= 20) return 100
  if (rate >= 10) return 50 + ((rate - 10) / 10) * 50
  if (rate >= 0) return (rate / 10) * 50
  return 0 // defisit
}

// ─── Component 2: Emergency Fund (25%) ───

function scoreEmergencyFund(transactions, monthlyData) {
  // Hitung total Tabungan Cash + Emas dari SEMUA transaksi (bukan filtered)
  const liquidSavings = transactions
    .filter(t => t.type === "savings" &&
      (t.category === "Tabungan Cash" || t.category === "Emas"))
    .reduce((sum, t) => sum + t.amount, 0)
  
  // Rata-rata pengeluaran dari SEMUA bulan yang ada data
  const monthsWithExpense = monthlyData.filter(m => m.pengeluaran > 0)
  if (monthsWithExpense.length === 0) return 100 // tidak ada pengeluaran
  
  const avgMonthlyExpense = monthsWithExpense.reduce((s, m) => s + m.pengeluaran, 0)
    / monthsWithExpense.length
  
  if (avgMonthlyExpense <= 0) return 100
  
  const months = liquidSavings / avgMonthlyExpense
  
  if (months >= 6) return 100
  return (months / 6) * 100
}

// ─── Component 3: Budget Adherence (20%) ───

function scoreBudgetAdherence(budgets, filteredExpenses, selectedMonth, selectedYear, selectedAccount) {
  // Filter budget untuk bulan/tahun terpilih
  const activeBudgets = budgets.filter(b => {
    if (selectedMonth !== "Semua Bulan" && b.bulan !== selectedMonth) return false
    if (selectedYear !== "Semua Tahun" && b.tahun !== String(selectedYear)) return false
    if (selectedAccount && selectedAccount !== "Semua Akun" && b.akun && b.akun !== selectedAccount) return false
    return true
  })
  
  if (activeBudgets.length === 0) return null // skip komponen
  
  // Hitung spending per kategori dari filtered expenses
  const expenseByCategory = {}
  for (const t of filteredExpenses) {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  }
  
  let underLimit = 0
  for (const b of activeBudgets) {
    const spent = expenseByCategory[b.kategori] || 0
    if (spent <= b.limit) underLimit++
  }
  
  return (underLimit / activeBudgets.length) * 100
}

// ─── Component 4: Goal Progress (15%) ───

function scoreGoalProgress(goals, goalProgress) {
  if (!goals || goals.length === 0) return null // skip komponen
  
  let totalPct = 0
  for (const goal of goals) {
    const contributed = goalProgress[goal.id] || 0
    const pct = goal.target > 0
      ? Math.min((contributed / goal.target) * 100, 100)
      : 100
    totalPct += pct
  }
  
  return totalPct / goals.length
}

// ─── Component 5: Net Worth Growth (10%) ───

function scoreNetWorthGrowth(netWorthHistory) {
  if (netWorthHistory.length < 2) return 50 // neutral
  
  const current = netWorthHistory[netWorthHistory.length - 1].value
  const previous = netWorthHistory[netWorthHistory.length - 2].value
  
  if (previous === 0) {
    return current > 0 ? 80 : 0
  }
  
  const growthRate = ((current - previous) / Math.abs(previous)) * 100
  
  if (growthRate >= 5) return 100
  if (growthRate <= -5) return 0
  return 50 + (growthRate / 5) * 50
}

// ─── Main function ───

/**
 * Hitung Skor Kesehatan Keuangan
 * 
 * @param {Object} params
 * @param {Array}  params.monthlyData     - dari /api/dashboard
 * @param {Array}  params.transactions    - dari /api/dashboard (SEMUA, bukan filtered)
 * @param {Array}  params.budgets         - dari /api/budgets
 * @param {Array}  params.goals           - dari /api/goals
 * @param {Object} params.goalProgress    - dari computeAllGoalProgress()
 * @param {Array}  params.netWorthHistory - dari /api/dashboard
 * @param {string} params.selectedMonth   - "Semua Bulan" atau nama bulan
 * @param {string|number} params.selectedYear - "Semua Tahun" atau tahun
 * @param {string} params.selectedAccount - "Semua Akun" atau nama akun
 * @returns {{ totalScore: number, grade: string, gradeColor: string, gradeDesc: string, components: Array }}
 */
export function computeFinancialHealthScore({
  monthlyData = [],
  transactions = [],
  budgets = [],
  goals = [],
  goalProgress = {},
  netWorthHistory = [],
  selectedMonth = "Semua Bulan",
  selectedYear = "Semua Tahun",
  selectedAccount = "Semua Akun",
} = {}) {
  // ─── Filter transactions by month/year/account ───
  const filtered = transactions.filter(t => {
    if (selectedMonth !== "Semua Bulan" && t.month !== selectedMonth) return false
    if (selectedYear !== "Semua Tahun" && t.year !== String(selectedYear)) return false
    if (selectedAccount !== "Semua Akun" && t.account !== selectedAccount) return false
    return true
  })

  const filteredIncome = filtered.filter(t => t.type === "income")
  const filteredExpense = filtered.filter(t => t.type === "expense")

  const totalIncome = filteredIncome.reduce((s, t) => s + t.amount, 0)
  const totalExpense = filteredExpense.reduce((s, t) => s + t.amount, 0)

  // ─── Compute each component ───
  const components = [
    {
      name: "Tabungan Rate",
      nameEn: "Savings Rate",
      score: scoreSavingsRate(totalIncome, totalExpense),
      weight: 0.30,
      icon: "💰",
      tip: totalIncome <= 0
        ? "Belum ada pemasukan tercatat"
        : ((totalIncome - totalExpense) / totalIncome) >= 0.2
          ? "Bagus! Kamu menabung ≥ 20% pemasukan"
          : "Coba kurangi pengeluaran atau tambah pemasukan",
    },
    {
      name: "Dana Darurat",
      nameEn: "Emergency Fund",
      score: scoreEmergencyFund(transactions, monthlyData),
      weight: 0.25,
      icon: "🏦",
      tip: (() => {
        const liquidSavings = transactions
          .filter(t => t.type === "savings" && (t.category === "Tabungan Cash" || t.category === "Emas"))
          .reduce((s, t) => s + t.amount, 0)
        const monthsWithExpense = monthlyData.filter(m => m.pengeluaran > 0)
        if (monthsWithExpense.length === 0) return "Belum ada data pengeluaran"
        const avg = monthsWithExpense.reduce((s, m) => s + m.pengeluaran, 0) / monthsWithExpense.length
        const months = avg > 0 ? liquidSavings / avg : 0
        if (months >= 6) return "Dana darurat sudah terpenuhi (6+ bulan)"
        return `Butuh ${(6 - months).toFixed(1)} bulan lagi untuk capai target`
      })(),
    },
    {
      name: "Patuh Budget",
      nameEn: "Budget Adherence",
      score: scoreBudgetAdherence(budgets, filteredExpense, selectedMonth, selectedYear, selectedAccount),
      weight: 0.20,
      icon: "📊",
      tip: (() => {
        const activeBudgets = budgets.filter(b => {
          if (selectedMonth !== "Semua Bulan" && b.bulan !== selectedMonth) return false
          if (selectedYear !== "Semua Tahun" && b.tahun !== String(selectedYear)) return false
          return true
        })
        if (activeBudgets.length === 0) return "Atur budget untuk mulai melacak"
        return `${activeBudgets.length} kategori berbudget`
      })(),
    },
    {
      name: "Progress Goal",
      nameEn: "Goal Progress",
      score: scoreGoalProgress(goals, goalProgress),
      weight: 0.15,
      icon: "🎯",
      tip: goals.length === 0
        ? "Buat goal untuk mulai menabung target"
        : `${goals.length} goal aktif`,
    },
    {
      name: "Pertumbuhan Aset",
      nameEn: "Net Worth Growth",
      score: scoreNetWorthGrowth(netWorthHistory),
      weight: 0.10,
      icon: "📈",
      tip: netWorthHistory.length < 2
        ? "Butuh minimal 2 bulan data"
        : (() => {
            const curr = netWorthHistory[netWorthHistory.length - 1].value
            const prev = netWorthHistory[netWorthHistory.length - 2].value
            if (prev === 0) return curr > 0 ? "Aset bertumbuh" : "Belum ada pertumbuhan"
            const pct = ((curr - prev) / Math.abs(prev)) * 100
            return pct >= 0
              ? `Aset naik ${pct.toFixed(1)}% dari bulan lalu`
              : `Aset turun ${Math.abs(pct).toFixed(1)}% dari bulan lalu`
          })(),
    },
  ]

  // ─── Weight redistribution for skipped components ───
  const active = components.filter(c => c.score !== null)
  const totalActiveWeight = active.reduce((s, c) => s + c.weight, 0)

  let totalScore = 0
  if (totalActiveWeight > 0) {
    for (const c of active) {
      totalScore += c.score * (c.weight / totalActiveWeight)
    }
  }
  totalScore = Math.round(totalScore)

  const { label: grade, color: gradeColor, desc: gradeDesc } = getGrade(totalScore)

  return {
    totalScore,
    grade,
    gradeColor,
    gradeDesc,
    components,
  }
}
