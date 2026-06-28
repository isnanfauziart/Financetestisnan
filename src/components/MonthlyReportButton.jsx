"use client"
import { useMemo, useCallback } from "react"
import { FileText, Download } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { useBudgets } from "@/lib/useSharedData"
import { generateReportHTML } from "@/lib/report"
import { computeHealthScore } from "@/lib/healthScore"

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

  // Filter monthlyData to the selected month/year for month-specific health score
  const monthFilteredData = useMemo(() => {
    if (!canReport || !monthlyData) return []
    return monthlyData.filter(
      (m) => m.month === selectedMonth && String(m.year) === String(selectedYear)
    )
  }, [canReport, monthlyData, selectedMonth, selectedYear])

  const healthScore = useMemo(() => {
    if (!canReport || !transactions || transactions.length === 0) return null
    return computeHealthScore({ transactions, monthlyData: monthFilteredData, budgets })
  }, [canReport, transactions, monthFilteredData, budgets])

  const handleDownload = useCallback(async () => {
    const html = generateReportHTML({
      month: selectedMonth,
      year: selectedYear,
      transactions: transactions || [],
      budgets: budgets || [],
      allTransactions: allTransactions || [],
      monthlyData: monthlyData || [],
      healthScore,
    })

    const html2pdf = (await import("html2pdf.js")).default

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.width = "800px"
    iframe.style.height = "1200px"
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    doc.open()
    doc.write(html)
    doc.close()

    await new Promise((r) => setTimeout(r, 500))

    const opt = {
      margin: [12, 12, 12, 12],
      filename: `Laporan-Keuangan-${selectedMonth}-${selectedYear}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    }

    try {
      await html2pdf().set(opt).from(doc.body).save()
    } finally {
      document.body.removeChild(iframe)
    }
  }, [selectedMonth, selectedYear, transactions, budgets, allTransactions, monthlyData, healthScore])

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
