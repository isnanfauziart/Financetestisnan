"use client"
import { useMemo } from "react"
import { FileText, Download } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { useBudgets, useGoals } from "@/lib/useSharedData"
import { generateReportHTML } from "@/lib/report"
import { computeHealthScore } from "@/lib/healthScore"
import Sheet from "@/app/dashboard/_components/Sheet"

export default function MonthlyReportButton({
  selectedMonth,
  selectedYear,
  transactions,
  monthlyData,
  allTransactions,
}) {
  const isSpecificMonth = selectedMonth && selectedMonth !== "Semua Bulan"
  const isSpecificYear = selectedYear && selectedYear !== "Semua Tahun"
  const canReport = isSpecificMonth && isSpecificYear

  const { budgets } = useBudgets(
    canReport ? selectedMonth : "",
    canReport ? selectedYear : ""
  )
  const { goals } = useGoals()

  const healthScore = useMemo(() => {
    if (!canReport || !transactions || transactions.length === 0) return null
    return computeHealthScore({ transactions, monthlyData, budgets, goals })
  }, [canReport, transactions, monthlyData, budgets, goals])

  const handleDownload = () => {
    const html = generateReportHTML({
      month: selectedMonth,
      year: selectedYear,
      transactions: transactions || [],
      budgets: budgets || [],
      goals: goals || [],
      allTransactions: allTransactions || [],
      monthlyData: monthlyData || [],
      healthScore,
    })

    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, "_blank")
    if (win) {
      win.addEventListener("load", () => {
        setTimeout(() => { win.print() }, 300)
      })
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

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
