"use client"
import { useMemo, useCallback, useState } from "react"
import { Calendar, Download } from "lucide-react"
import { AVAILABLE_MONTHS, THEME } from "@/app/dashboard/_components/constants"
import { generateAnnualReportHTML } from "@/lib/report"
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

export default function YearInReviewButton({ transactions, monthlyData, routineMonthlyData, userName }) {
  const [generating, setGenerating] = useState(false)

  const currentYear = String(new Date().getFullYear())

  const canReport = useMemo(() => {
    if (!transactions || transactions.length === 0) return false
    const yearTx = transactions.filter(t => String(t.year) === currentYear)
    return yearTx.length >= 10
  }, [transactions, currentYear])

  const yearTxCount = useMemo(() => {
    if (!transactions) return 0
    return transactions.filter(t => String(t.year) === currentYear).length
  }, [transactions, currentYear])

  const reportRoutineMonthlyData = useMemo(() => {
    if (Array.isArray(routineMonthlyData) && routineMonthlyData.length > 0) return routineMonthlyData
    return buildRoutineMonthlyData(transactions || [])
  }, [routineMonthlyData, transactions])

  const handleDownload = useCallback(async () => {
    setGenerating(true)
    try {
      const html = generateAnnualReportHTML({
        year: currentYear,
        transactions: transactions || [],
        monthlyData: monthlyData || [],
        routineMonthlyData: reportRoutineMonthlyData,
        userName,
      })

      const loadHtml2pdf = new Function('return import("html2pdf.js")')
      const html2pdf = (await loadHtml2pdf()).default

      const container = document.createElement("div")
      container.innerHTML = html
      container.style.position = "fixed"
      container.style.left = "-9999px"
      container.style.top = "0"
      container.style.width = "800px"
      document.body.appendChild(container)

      const opt = {
        margin: [12, 12, 12, 12],
        filename: `Year-in-Review-${currentYear}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      }

      try {
        await html2pdf().set(opt).from(container).save()
      } finally {
        document.body.removeChild(container)
      }
    } catch (err) {
      console.error("Year-in-Review generation failed:", err)
    } finally {
      setGenerating(false)
    }
  }, [currentYear, transactions, monthlyData, reportRoutineMonthlyData, userName])

  return (
    <button
      onClick={canReport ? handleDownload : undefined}
      disabled={!canReport || generating}
      aria-label={canReport ? `Unduh Year-in-Review ${currentYear}` : `Butuh minimal 10 transaksi di ${currentYear}`}
      className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all group ${
        canReport
          ? "glass-warm border-md3-outline-variant shadow-warm hover:shadow-pop hover:border-violet-200 active:scale-[0.98]"
          : "bg-md3-surface border-md3-outline-variant opacity-60 cursor-not-allowed"
      }`}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: canReport ? THEME.warningBg : THEME.surfaceWarm }}
      >
        {generating ? (
          <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Calendar size={18} color={canReport ? THEME.warning : "#b8a590"} aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Year-in-Review</p>
        <p className={`text-sm font-semibold ${canReport ? "text-md3-on-surface" : "text-earth-400"}`}>
          {generating
            ? "Membuat laporan..."
            : canReport
              ? `Unduh Year-in-Review ${currentYear}`
              : `Butuh minimal 10 transaksi di ${currentYear} (${yearTxCount}/10)`}
        </p>
      </div>
      {canReport && !generating && (
        <Download
          size={16}
          className="text-earth-400 group-hover:text-violet-600 transition-colors flex-shrink-0"
          aria-hidden="true"
        />
      )}
    </button>
  )
}
