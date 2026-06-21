"use client"
import { useMemo, useCallback, useState } from "react"
import { Calendar, Download } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { generateAnnualReportHTML } from "@/lib/report"

export default function YearInReviewButton({ transactions, monthlyData }) {
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

  const handleDownload = useCallback(async () => {
    setGenerating(true)
    try {
      const html = generateAnnualReportHTML({
        year: currentYear,
        transactions: transactions || [],
        monthlyData: monthlyData || [],
      })

      const html2pdf = (await import("html2pdf.js")).default

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
  }, [currentYear, transactions, monthlyData])

  return (
    <button
      onClick={canReport ? handleDownload : undefined}
      disabled={!canReport || generating}
      aria-label={canReport ? `Unduh Year-in-Review ${currentYear}` : `Butuh minimal 10 transaksi di ${currentYear}`}
      className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all group ${
        canReport
          ? "glass-warm border-earth-200 shadow-warm hover:shadow-pop hover:border-violet-200 active:scale-[0.98]"
          : "bg-earth-50 border-earth-100 opacity-60 cursor-not-allowed"
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
        <p className="text-[9px] font-bold uppercase tracking-wider text-earth-500">Year-in-Review</p>
        <p className={`text-sm font-semibold ${canReport ? "text-earth-800" : "text-earth-400"}`}>
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
