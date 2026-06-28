import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { pickAmount } from "@/lib/parseSheetRow"

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { accessToken, spreadsheetId } = auth

  try {
    const incomeRows = await getSheetData(accessToken, "Pemasukan!A:O", spreadsheetId)
    const expenseRows = await getSheetData(accessToken, "Pengeluaran!A:O", spreadsheetId)
    const savingsRows = await getSheetData(accessToken, "Tabungan!A:O", spreadsheetId).catch(() => [])

    const transactions = []
    const MONTH_ORDER = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12 }
    const mkKey = (m, y) => `${y}-${String(MONTH_ORDER[m] || 0).padStart(2, "0")}`

    const monthlyIncome = {}
    for (let i = 1; i < incomeRows.length; i++) {
      const row = incomeRows[i]
      if (!row || !row[10]) continue
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
          account: String(row[7] || "").trim(),
          eventId: String(row[13] || "").trim() || null,
          eventSubKategori: String(row[14] || "").trim() || null,
        })
      }
    }

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
          account: String(row[7] || "").trim(),
          eventId: String(row[13] || "").trim() || null,
          eventSubKategori: String(row[14] || "").trim() || null,
        })
      }
    }

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
          account: String(row[7] || "").trim(),
          eventId: String(row[13] || "").trim() || null,
          eventSubKategori: String(row[14] || "").trim() || null,
        })
      }
    }

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

    const yearMonthAmounts = {}
    for (const t of transactions) {
      const k = mkKey(t.month, t.year)
      if (!yearMonthAmounts[k]) yearMonthAmounts[k] = { income: 0, expense: 0, savings: 0, month: t.month, year: t.year }
      yearMonthAmounts[k][t.type] += t.amount
    }
    const sortedKeys = Object.keys(yearMonthAmounts).sort()

    let startingBalance = 0
    let startingBalanceDate = ""
    try {
      const settingsRows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId)
      for (const row of settingsRows) {
        const key = String(row?.[0] || "").trim().toLowerCase()
        if (key === "startingbalance") {
          startingBalance = parseRupiah(row[1] || 0)
        } else if (key === "startingbalancedate") {
          startingBalanceDate = String(row[1] || "").trim()
        }
      }
    } catch (err) {
      // Settings tab may not exist yet
    }

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

    transactions.reverse()

    let billsSummary = { upcoming: [], overdue: [], totalUpcoming: 0, totalOverdue: 0, overdueCount: 0 }
    try {
      const billsRows = await getSheetData(accessToken, "Tagihan!A:M", spreadsheetId)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcoming = []
      const overdue = []
      for (let i = 1; i < billsRows.length; i++) {
        const r = billsRows[i]
        if (!r || !r[0] || !r[1]) continue
        const aktif = String(r[9] || "TRUE").trim().toUpperCase() === "TRUE"
        if (!aktif) continue
        const nama = String(r[1] || "").trim()
        const jumlah = parseRupiah(r[2] || 0)
        const tipe = String(r[3] || "expense").trim().toLowerCase()
        const kategoriBill = String(r[4] || "").trim()
        const frekuensi = String(r[6] || "monthly").trim().toLowerCase()
        const tanggalJatuhTempo = parseInt(r[7], 10) || 1
        const akunBank = String(r[8] || "").trim()
        const id = String(r[0] || "").trim()

        let nextDue = new Date(today.getFullYear(), today.getMonth(), tanggalJatuhTempo)
        if (nextDue < today) {
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, tanggalJatuhTempo)
        }
        nextDue.setHours(0, 0, 0, 0)
        const daysUntilDue = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24))
        let status = "upcoming"
        if (daysUntilDue < 0) status = "overdue"
        else if (daysUntilDue === 0) status = "due_today"
        else if (daysUntilDue <= 1) status = "due_soon"

        const bill = { id, nama, jumlah, tipe, kategoriBill, frekuensi, tanggalJatuhTempo, akunBank, daysUntilDue, status, nextDueDate: nextDue.toISOString().split("T")[0] }
        if (status === "overdue") overdue.push(bill)
        else upcoming.push(bill)
      }
      upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      overdue.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      billsSummary = {
        upcoming: upcoming.slice(0, 5),
        overdue,
        totalUpcoming: upcoming.reduce((s, b) => s + b.jumlah, 0),
        totalOverdue: overdue.reduce((s, b) => s + b.jumlah, 0),
        overdueCount: overdue.length,
      }
    } catch {
      // Tagihan tab doesn't exist yet
    }

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
      billsSummary,
      serverTimestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[Dashboard]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
