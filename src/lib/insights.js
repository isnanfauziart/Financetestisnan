import { isSpecialExpense } from "@/lib/expenseClass"

const COLORS = {
  sage: "#2F6B57",
  amber: "#8A5A00",
  danger: "#B33A3A",
  primary: "#6E59B5",
  savings: "#2D6A62",
  primaryDeep: "#255344",
}

function hash(value) {
  let result = 2166136261
  for (let i = 0; i < value.length; i++) {
    result = Math.imul(result ^ value.charCodeAt(i), 16777619)
  }
  return result >>> 0
}

export function selectStableInsights({ transactions = [], weekPeriod = "", limit = 3 }) {
  if (!transactions.length) return []

  let income = 0
  let expense = 0
  let savings = 0
  const expenseCategories = {}
  const expenseAccounts = {}

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0
    if (transaction.type === "income") income += amount
    if (transaction.type === "savings") savings += amount
    if (transaction.type === "expense" && !isSpecialExpense(transaction)) {
      expense += amount
      const category = transaction.category || "Lainnya"
      const account = transaction.account || "Tanpa akun"
      expenseCategories[category] = (expenseCategories[category] || 0) + amount
      expenseAccounts[account] = (expenseAccounts[account] || 0) + amount
    }
  }

  const cards = []
  if (income > 0) {
    const ratio = (expense / income) * 100
    cards.push({
      key: "spending-ratio",
      type: ratio < 50 ? "positive" : ratio < 80 ? "info" : "warning",
      iconKey: ratio < 50 ? "target" : "activity",
      text: ratio < 50
        ? `Sangat sehat — ${ratio.toFixed(0)}% pendapatan terpakai`
        : ratio < 80
          ? `Moderat — ${ratio.toFixed(0)}% pendapatan terpakai`
          : `Tinggi — ${ratio.toFixed(0)}% pendapatan terpakai`,
      color: ratio < 50 ? COLORS.sage : ratio < 80 ? COLORS.amber : COLORS.danger,
    })
  }

  const topCategory = Object.entries(expenseCategories)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (topCategory) {
    cards.push({
      key: "top-category",
      type: "info",
      iconKey: "credit-card",
      text: `Kategori terbesar: ${topCategory[0]} (${((topCategory[1] / expense) * 100).toFixed(0)}% dari pengeluaran)`,
      color: COLORS.primary,
    })
  }

  if (savings > 0) {
    cards.push({
      key: "savings",
      type: "positive",
      iconKey: "piggy-bank",
      text: `Total tabungan: Rp${Math.round(savings).toLocaleString("id-ID")}`,
      color: COLORS.savings,
    })
  }

  const topAccount = Object.entries(expenseAccounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (topAccount) {
    cards.push({
      key: "top-account",
      type: "info",
      iconKey: "user",
      text: `Akun pengeluaran terbesar: ${topAccount[0]}`,
      color: COLORS.primaryDeep,
    })
  }

  const count = Math.min(3, Math.max(0, Number(limit) || 0))
  return cards
    .sort((a, b) => hash(`${weekPeriod}:${a.key}`) - hash(`${weekPeriod}:${b.key}`) || a.key.localeCompare(b.key))
    .slice(0, count)
}
