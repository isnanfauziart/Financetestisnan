import { getToken } from "next-auth/jwt"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { pickAmount } from "@/lib/parseSheetRow"

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    // Baca transaksi pemasukan (kolom: Tanggal, ID, Ket, Kategori, Jumlah, Pajak, Biaya, AkunBank, Net, Catatan, M, Y, Y2)
    const incomeRows = await getSheetData(accessToken, "Pemasukan!A:M")
    // Baca transaksi pengeluaran
    const expenseRows = await getSheetData(accessToken, "Pengeluaran!A:M")
    // Baca transaksi tabungan
    const savingsRows = await getSheetData(accessToken, "Tabungan!A:M").catch(() => [])

    const transactions = []
    const MONTH_ORDER = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12 }
    const mkKey = (m, y) => `${y}-${String(MONTH_ORDER[m] || 0).padStart(2, "0")}`

    // Parse pemasukan per bulan (keyed by "Jan 2025" format)
    const monthlyIncome = {}
    for (let i = 1; i < incomeRows.length; i++) {
      const row = incomeRows[i]
      if (!row || !row[10]) continue // kolom M = nama bulan
      const month = String(row[10]).trim()
      const year = String(row[11] || new Date().getFullYear()).trim()
      const amount = pickAmount(row)
      if (amount > 0) {
        const key = `${month} ${year}`
        monthlyIncome[key] = (monthlyIncome[key] || 0) + amount
        transactions.push({
          id: row[1] || `in-${i}`,
          rowIndex: i + 1,
          date: row[0],
          desc: row[2] || "",
          category: row[3] || "Lainnya",
          amount: amount,
          type: "income",
          month: month,
          year: year,
          account: String(row[7] || "").trim()
        })
      }
    }

    // Parse pengeluaran per bulan + per kategori
    const monthlyExpense = {}
    const categoryMap = {}
    for (let i = 1; i < expenseRows.length; i++) {
      const row = expenseRows[i]
      if (!row || !row[10]) continue
      const month = String(row[10]).trim()
      const year = String(row[11] || new Date().getFullYear()).trim()
      const cat = String(row[3] || "Lainnya").trim()
      const amount = pickAmount(row)
      if (amount > 0) {
        const key = `${month} ${year}`
        monthlyExpense[key] = (monthlyExpense[key] || 0) + amount
        categoryMap[cat] = (categoryMap[cat] || 0) + amount
        transactions.push({
          id: row[1] || `ex-${i}`,
          rowIndex: i + 1,
          date: row[0],
          desc: row[2] || "",
          category: cat,
          amount: amount,
          type: "expense",
          month: month,
          year: year,
          account: String(row[7] || "").trim()
        })
      }
    }

    // Parse tabungan per bulan
    const monthlySavings = {}
    for (let i = 1; i < savingsRows.length; i++) {
      const row = savingsRows[i]
      if (!row || !row[10]) continue
      const month = String(row[10]).trim()
      const year = String(row[11] || new Date().getFullYear()).trim()
      const cat = String(row[3] || "Tabungan").trim()
      const amount = pickAmount(row)
      if (amount > 0) {
        const key = `${month} ${year}`
        monthlySavings[key] = (monthlySavings[key] || 0) + amount
        transactions.push({
          id: row[1] || `sv-${i}`,
          rowIndex: i + 1,
          date: row[0],
          desc: row[2] || "",
          category: cat,
          amount: amount,
          type: "savings",
          month: month,
          year: year,
          account: String(row[7] || "").trim()
        })
      }
    }

    // Gabungkan data bulanan — year-aware, sorted chronologically
    const allKeys = new Set([...Object.keys(monthlyIncome), ...Object.keys(monthlyExpense), ...Object.keys(monthlySavings)])
    const monthlyData = Array.from(allKeys)
      .map(k => {
        const parts = k.split(" ")
        const month = parts[0]
        const year = parts[1]
        return {
          month,
          year,
          sortKey: mkKey(month, year),
          pemasukan: monthlyIncome[k] || 0,
          pengeluaran: monthlyExpense[k] || 0,
          surplus: (monthlyIncome[k] || 0) - (monthlyExpense[k] || 0),
          tabungan: monthlySavings[k] || 0,
        }
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

    const totalIncome = Object.values(monthlyIncome).reduce((s, v) => s + v, 0)
    const totalExpense = Object.values(monthlyExpense).reduce((s, v) => s + v, 0)
    const totalSavings = Object.values(monthlySavings).reduce((s, v) => s + v, 0)
    const totalSurplus = totalIncome - totalExpense
    const profitMargin = totalIncome > 0 ? ((totalSurplus / totalIncome) * 100).toFixed(1) : 0

    const categories = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)

    // Compute net worth: cumulative (income - expense + savings) over time
    // Net Worth = startingBalance + (Income − Expense) + Savings  (savings treated as accumulated wealth)
    const yearMonthAmounts = {}
    for (const t of transactions) {
      const k = mkKey(t.month, t.year)
      if (!yearMonthAmounts[k]) yearMonthAmounts[k] = { income: 0, expense: 0, savings: 0, month: t.month, year: t.year }
      yearMonthAmounts[k][t.type] += t.amount
    }
    const sortedKeys = Object.keys(yearMonthAmounts).sort()

    // Read starting balance and date from Settings tab
    let startingBalance = 0
    let startingBalanceDate = ""
    try {
      const settingsRows = await getSheetData(accessToken, "Settings!A:B")
      for (const row of settingsRows) {
        const key = String(row?.[0] || "").trim()
        if (key === "startingBalance") {
          startingBalance = parseRupiah(row[1] || 0)
        } else if (key === "startingBalanceDate") {
          startingBalanceDate = String(row[1] || "").trim()
        }
      }
    } catch (err) {
      // Settings tab may not exist yet — default to 0
    }

    // Parse starting balance month/year for filtering
    let startMonth = null
    let startYear = null
    if (startingBalanceDate) {
      const parts = startingBalanceDate.split("-")
      if (parts.length === 3) {
        const monthIdx = parseInt(parts[1], 10) - 1
        startMonth = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][monthIdx]
        startYear = parts[0]
      }
    }

    const netWorthHistory = []
    let cum = startingBalance
    for (const k of sortedKeys) {
      const d = yearMonthAmounts[k]
      // Only count transactions from startingBalanceDate forward
      const isAfterStart = !startMonth || !startYear
        || (d.year > startYear)
        || (d.year === startYear && MONTH_ORDER[d.month] >= MONTH_ORDER[startMonth])
      if (isAfterStart) {
        cum += d.income - d.expense
      }
      netWorthHistory.push({ month: d.month, year: d.year, value: cum })
    }
    const netWorth = netWorthHistory.length > 0 ? netWorthHistory[netWorthHistory.length - 1].value : startingBalance
    const netWorthMonthlyDelta = netWorthHistory.length >= 2
      ? netWorthHistory[netWorthHistory.length - 1].value - netWorthHistory[netWorthHistory.length - 2].value
      : 0

    // Reverse to show newest transactions first roughly (assuming appended at bottom)
    transactions.reverse()

    return Response.json({
      totalIncome,
      totalExpense,
      totalSurplus,
      totalSavings,
      profitMargin,
      monthlyData,
      categories,
      transactions,
      netWorth,
      netWorthMonthlyDelta,
      netWorthHistory,
      startingBalance,
      serverTimestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[Dashboard]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}