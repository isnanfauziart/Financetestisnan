import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const SHEET_ID = process.env.SPREADSHEET_ID

    // Baca transaksi pemasukan (kolom: Tanggal, ID, Ket, Kategori, Jumlah, Pajak, Biaya, AkunBank, Net, Catatan, M, Y, Y2)
    const incomeRows = await getSheetData(session.accessToken, "Pemasukan!A:M")
    // Baca transaksi pengeluaran
    const expenseRows = await getSheetData(session.accessToken, "Pengeluaran!A:M")
    // Baca transaksi tabungan
    const savingsRows = await getSheetData(session.accessToken, "Tabungan!A:M").catch(() => [])

    const transactions = []

    // Parse pemasukan per bulan
    const monthlyIncome = {}
    for (let i = 1; i < incomeRows.length; i++) {
      const row = incomeRows[i]
      if (!row || !row[10]) continue // kolom M = nama bulan
      const month = String(row[10]).trim()
      const amount = parseRupiah(row[8] || row[4] || 0)
      if (amount > 0) {
        monthlyIncome[month] = (monthlyIncome[month] || 0) + amount
        transactions.push({
          id: row[1] || `in-${i}`,
          date: row[0],
          desc: row[2] || "",
          category: row[3] || "Lainnya",
          amount: amount,
          type: "income",
          month: month,
          year: String(row[11] || new Date().getFullYear()).trim()
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
      const cat = String(row[3] || "Lainnya").trim()
      const amount = parseRupiah(row[8] || row[4] || 0)
      if (amount > 0) {
        monthlyExpense[month] = (monthlyExpense[month] || 0) + amount
        categoryMap[cat] = (categoryMap[cat] || 0) + amount
        transactions.push({
          id: row[1] || `ex-${i}`,
          date: row[0],
          desc: row[2] || "",
          category: cat,
          amount: amount,
          type: "expense",
          month: month,
          year: String(row[11] || new Date().getFullYear()).trim()
        })
      }
    }

    // Parse tabungan per bulan
    const monthlySavings = {}
    for (let i = 1; i < savingsRows.length; i++) {
      const row = savingsRows[i]
      if (!row || !row[10]) continue
      const month = String(row[10]).trim()
      const cat = String(row[3] || "Tabungan").trim()
      const amount = parseRupiah(row[8] || row[4] || 0)
      if (amount > 0) {
        monthlySavings[month] = (monthlySavings[month] || 0) + amount
        transactions.push({
          id: row[1] || `sv-${i}`,
          date: row[0],
          desc: row[2] || "",
          category: cat,
          amount: amount,
          type: "savings",
          month: month,
          year: String(row[11] || new Date().getFullYear()).trim()
        })
      }
    }

    // Gabungkan data bulanan
    const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
    const monthlyData = MONTHS
      .filter(m => monthlyIncome[m] || monthlyExpense[m] || monthlySavings[m])
      .map(m => ({
        month: m,
        pemasukan: monthlyIncome[m] || 0,
        pengeluaran: monthlyExpense[m] || 0,
        surplus: (monthlyIncome[m] || 0) - (monthlyExpense[m] || 0),
        tabungan: monthlySavings[m] || 0,
      }))

    const totalIncome = Object.values(monthlyIncome).reduce((s, v) => s + v, 0)
    const totalExpense = Object.values(monthlyExpense).reduce((s, v) => s + v, 0)
    const totalSavings = Object.values(monthlySavings).reduce((s, v) => s + v, 0)
    const totalSurplus = totalIncome - totalExpense
    const profitMargin = totalIncome > 0 ? ((totalSurplus / totalIncome) * 100).toFixed(1) : 0

    const categories = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)

    // Reverse to show newest transactions first roughly (assuming appended at bottom)
    transactions.reverse()

    return Response.json({ totalIncome, totalExpense, totalSurplus, totalSavings, profitMargin, monthlyData, categories, transactions })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}