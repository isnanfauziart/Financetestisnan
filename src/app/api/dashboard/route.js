import { getAuthContext } from "@/lib/apiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const MONTH_ORDER = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12 }
const mkKey = (m, y) => `${y}-${String(MONTH_ORDER[m] || 0).padStart(2, "0")}`

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { user } = auth

  try {
    // Read all transactions from Supabase
    const { data: allTransactions, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("tanggal", { ascending: false })

    if (txError) {
      console.error("[Dashboard] Error reading transactions:", txError.message)
    }

    const transactions = []
    const monthlyIncome = {}
    const monthlyExpense = {}
    const monthlySavings = {}
    const categoryMap = {}

    for (const tx of allTransactions || []) {
      const month = tx.bulan
      const year = tx.tahun
      const amount = parseFloat(tx.jumlah) || 0

      if (amount <= 0) continue

      const key = `${month} ${year}`

      if (tx.tipe === "income") {
        monthlyIncome[key] = (monthlyIncome[key] || 0) + amount
      } else if (tx.tipe === "expense") {
        monthlyExpense[key] = (monthlyExpense[key] || 0) + amount
        const cat = tx.kategori || "Lainnya"
        categoryMap[cat] = (categoryMap[cat] || 0) + amount
      } else if (tx.tipe === "savings") {
        monthlySavings[key] = (monthlySavings[key] || 0) + amount
      }

      transactions.push({
        id: tx.id,
        rowIndex: tx.row_index,
        date: tx.tanggal,
        desc: tx.keterangan || "",
        category: tx.kategori || "Lainnya",
        amount,
        type: tx.tipe,
        month,
        year,
        account: tx.akun_bank || "",
        eventId: tx.event_id,
        eventSubKategori: tx.event_sub_kategori,
      })
    }

    // Combine monthly data
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

    // Net worth calculation
    const yearMonthAmounts = {}
    for (const t of transactions) {
      const k = mkKey(t.month, t.year)
      if (!yearMonthAmounts[k]) yearMonthAmounts[k] = { income: 0, expense: 0, savings: 0, month: t.month, year: t.year }
      yearMonthAmounts[k][t.type] += t.amount
    }
    const sortedKeys = Object.keys(yearMonthAmounts).sort()

    // Read starting balance from Supabase
    let startingBalance = 0
    let startingBalanceDate = ""
    const { data: settingsData } = await supabaseAdmin
      .from("user_settings")
      .select("key, value")
      .eq("user_id", user.id)
      .in("key", ["startingBalance", "startingBalanceDate", "startingbalance", "startingbalancedate"])

    for (const s of settingsData || []) {
      const key = s.key.toLowerCase()
      if (key === "startingbalance") {
        startingBalance = parseRupiah(s.value || 0)
      } else if (key === "startingbalancedate") {
        startingBalanceDate = s.value || ""
      }
    }

    // Parse starting balance month/year
    let startMonth = null
    let startYear = null
    if (startingBalanceDate) {
      const parts = startingBalanceDate.split("-")
      if (parts.length === 3) {
        const monthIdx = parseInt(parts[1], 10) - 1
        startMonth = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][monthIdx]
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

    // Bills summary from Supabase
    let billsSummary = { upcoming: [], overdue: [], totalUpcoming: 0, totalOverdue: 0, overdueCount: 0 }
    try {
      const { data: billsData } = await supabaseAdmin
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .eq("aktif", true)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcoming = []
      const overdue = []

      for (const bill of billsData || []) {
        const tanggalJatuhTempo = bill.tanggal_jatuh_tempo || 1
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

        const billData = {
          id: bill.id,
          nama: bill.nama,
          jumlah: parseFloat(bill.jumlah) || 0,
          tipe: bill.tipe,
          kategoriBill: bill.kategori_bill,
          frekuensi: bill.frekuensi,
          tanggalJatuhTempo,
          akunBank: bill.akun_bank,
          daysUntilDue,
          status,
          nextDueDate: nextDue.toISOString().split("T")[0],
        }

        if (status === "overdue") overdue.push(billData)
        else upcoming.push(billData)
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
      // Bills table may not have data
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
