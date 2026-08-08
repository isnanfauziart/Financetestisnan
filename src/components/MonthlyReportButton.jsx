"use client"
import { useMemo, useCallback } from "react"
import { FileText, Download } from "lucide-react"
import { AVAILABLE_MONTHS, THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { useBudgets, useSettings } from "@/lib/useSharedData"
import { generateReportPDF } from "@/lib/reportPdf"
import { computeHealthScore } from "@/lib/healthScore"
import { hasFeature } from "@/lib/featureAccess"
import { isSpecialExpense } from "@/lib/expenseClass"

function buildRoutineMonthlyData(transactions = []) {
  const rows = new Map()

  for (const transaction of transactions) {
    if (!transaction?.month || transaction.year === undefined || transaction.year === null) continue
    const key = `${transaction.month} ${transaction.year}`
    if (!rows.has(key)) {
      rows.set(key, {
        month: transaction.month,
        year: transaction.year,
        sortKey: `${transaction.year}-${String(AVAILABLE_MONTHS.indexOf(transaction.month) + 1).padStart(2, "0")}`,
        pemasukan: 0,
        pengeluaranRutin: 0,
        pengeluaranSpesial: 0,
        pengeluaranAktual: 0,
        surplusRutin: 0,
        tabungan: 0,
      })
    }

    const row = rows.get(key)
    if (transaction.type === "income") row.pemasukan += Number(transaction.amount) || 0
    if (transaction.type === "savings") row.tabungan += Number(transaction.amount) || 0
    if (transaction.type === "expense") {
      const amount = Number(transaction.amount) || 0
      row.pengeluaranAktual += amount
      if (isSpecialExpense(transaction)) row.pengeluaranSpesial += amount
      else row.pengeluaranRutin += amount
    }
  }

  return Array.from(rows.values())
    .map(row => ({ ...row, surplusRutin: row.pemasukan - row.pengeluaranRutin }))
    .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
}

export default function MonthlyReportButton({
  selectedMonth,
  selectedYear,
  transactions,
  monthlyData,
  routineMonthlyData,
  allTransactions,
  userName,
  entitlement,
  monthlyPdfWatermark,
}) {
  const isSpecificMonth = selectedMonth && selectedMonth !== "Semua Bulan"
  const isSpecificYear = selectedYear && selectedYear !== "Semua Tahun"
  const canReport = hasFeature(entitlement, "pdfReports") && isSpecificMonth && isSpecificYear

  const { budgets } = useBudgets(
    canReport ? selectedMonth : "",
    canReport ? selectedYear : ""
  )
  const { settings } = useSettings()
  const configuredSavings = settings?.categories?.savings
  const liquidSavingsCategories = Array.isArray(configuredSavings)
    ? configuredSavings.filter(item => (item.savingsKind || item.kind) === "liquid" && item.active !== false).map(item => typeof item === "string" ? item : item.name)
    : undefined

  const monthFilteredData = useMemo(() => {
    if (!canReport || !monthlyData) return []
    return monthlyData.filter(
      (m) => m.month === selectedMonth && String(m.year) === String(selectedYear)
    )
  }, [canReport, monthlyData, selectedMonth, selectedYear])

  const reportRoutineMonthlyData = useMemo(() => {
    if (Array.isArray(routineMonthlyData) && routineMonthlyData.length > 0) return routineMonthlyData
    const sourceTransactions = Array.isArray(allTransactions) && allTransactions.length > 0 ? allTransactions : transactions
    return buildRoutineMonthlyData(sourceTransactions || [])
  }, [routineMonthlyData, allTransactions, transactions])

  const routineMonthFilteredData = useMemo(() => {
    if (!canReport) return []
    return reportRoutineMonthlyData.filter(
      (m) => m.month === selectedMonth && String(m.year) === String(selectedYear)
    )
  }, [canReport, reportRoutineMonthlyData, selectedMonth, selectedYear])

  const healthScore = useMemo(() => {
    if (!canReport || !hasFeature(entitlement, "healthScore") || !transactions || transactions.length === 0) return null
    return computeHealthScore({ transactions, monthlyData: monthFilteredData, routineMonthlyData: routineMonthFilteredData, budgets, liquidSavingsCategories })
  }, [canReport, transactions, monthFilteredData, routineMonthFilteredData, budgets, entitlement, liquidSavingsCategories])

  const handleDownload = useCallback(() => {
    generateReportPDF({
      month: selectedMonth,
      year: selectedYear,
      transactions: transactions || [],
      budgets: budgets || [],
      allTransactions: allTransactions || [],
      monthlyData: monthlyData || [],
      routineMonthlyData: reportRoutineMonthlyData,
      healthScore,
      userName,
    }, { watermark: entitlement?.monthlyPdfWatermark ?? monthlyPdfWatermark === true })
  }, [selectedMonth, selectedYear, transactions, budgets, allTransactions, monthlyData, reportRoutineMonthlyData, healthScore, userName, entitlement, monthlyPdfWatermark])

  return (
    <button
      onClick={canReport ? handleDownload : undefined}
      disabled={!canReport}
      aria-label={canReport ? `Unduh laporan ${selectedMonth} ${selectedYear}` : "Pilih bulan tertentu untuk membuat laporan"}
      className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all group ${
        canReport
          ? "glass-warm border-earth-200 shadow-warm hover:shadow-pop hover:border-violet-200 active:scale-[0.98]"
          : "bg-earth-50 border-earth-100 opacity-60 cursor-not-allowed"
      }`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: canReport ? THEME.primaryBg : THEME.surfaceWarm }}
      >
        <FileText size={18} color={canReport ? THEME.primary : "#b8a590"} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[9px] font-bold uppercase tracking-wider text-earth-500">Laporan Bulanan</p>
        <p className={`text-sm font-semibold ${canReport ? "text-earth-800" : "text-earth-400"}`}>
          {canReport
            ? `Unduh Laporan \u00b7 ${selectedMonth} ${selectedYear}`
            : "Pilih bulan tertentu untuk membuat laporan"}
        </p>
      </div>
      {canReport && (
        <Download
          size={16}
          className="text-earth-400 group-hover:text-violet-600 transition-colors flex-shrink-0"
          aria-hidden="true"
        />
      )}
    </button>
  )
}
