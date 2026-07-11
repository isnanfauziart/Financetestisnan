"use client"
import { useMemo, useState } from "react"
import { Target, TrendingUp, Clock, Zap, Info } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull, useCountUp } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"

const OBSERVATION_WINDOW = 12

function formatMonthYear(date) {
  return `${AVAILABLE_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export default function FITrackerCard({ netWorth, monthlyData }) {
  const [formulaOpen, setFormulaOpen] = useState(false)

  const fi = useMemo(() => {
    if (!Array.isArray(monthlyData) || monthlyData.length < 2) {
      return {
        ready: false,
        message: "Catat transaksi selama minimal 2 bulan untuk melihat estimasi FI.",
      }
    }

    if (!Number.isFinite(netWorth)) {
      return {
        ready: false,
        message: "Nilai net worth belum tersedia. Coba muat ulang dashboard.",
      }
    }

    const windowSize = Math.min(monthlyData.length, OBSERVATION_WINDOW)
    const trailingMonths = monthlyData.slice(-windowSize)
    const expenseMonths = trailingMonths.filter((m) => m.pengeluaran > 0)

    if (expenseMonths.length === 0) {
      return {
        ready: false,
        message: "Tambahkan pengeluaran agar target FI dapat dihitung.",
      }
    }

    const avgMonthlyExpense = trailingMonths.reduce((sum, m) => sum + (m.pengeluaran || 0), 0) / windowSize
    const avgMonthlyIncome = trailingMonths.reduce((sum, m) => sum + (m.pemasukan || 0), 0) / windowSize
    const avgMonthlySurplus = avgMonthlyIncome - avgMonthlyExpense
    const annualExpenses = avgMonthlyExpense * 12
    const fiNumber = annualExpenses * 25
    const rawProgress = fiNumber > 0 ? (netWorth / fiNumber) * 100 : 0
    const displayProgress = Math.max(0, Math.min(100, rawProgress))
    const remaining = Math.max(0, fiNumber - netWorth)
    const isFIAchieved = fiNumber > 0 && netWorth >= fiNumber
    const hasPositiveSurplus = avgMonthlySurplus > 0
    const monthsToFI = !isFIAchieved && hasPositiveSurplus ? remaining / avgMonthlySurplus : null
    const yearsToFI = monthsToFI !== null ? monthsToFI / 12 : null

    const now = new Date()
    const fiDate = new Date(now)
    if (monthsToFI !== null) {
      fiDate.setMonth(fiDate.getMonth() + Math.ceil(monthsToFI))
    }

    const scenarios = []
    if (!isFIAchieved && monthsToFI !== null) {
      for (const pct of [10, 20, 30]) {
        const extraSavings = avgMonthlySurplus * (pct / 100)
        const newMonthly = avgMonthlySurplus + extraSavings
        const newMonths = remaining / newMonthly
        const yearsSaved = (monthsToFI - newMonths) / 12
        if (yearsSaved > 0.1) {
          const newDate = new Date(now)
          newDate.setMonth(newDate.getMonth() + Math.ceil(newMonths))
          scenarios.push({
            pct,
            yearsSaved: yearsSaved.toFixed(1),
            newDate: formatMonthYear(newDate),
          })
        }
      }
    }

    return {
      ready: true,
      windowSize,
      fiNumber: Math.round(fiNumber),
      fiProgress: displayProgress,
      netWorth,
      remaining,
      isFIAchieved,
      isNetWorthNegative: netWorth < 0,
      yearsToFI: yearsToFI !== null ? yearsToFI.toFixed(1) : null,
      fiDate: isFIAchieved ? "Target FI tercapai" : monthsToFI !== null ? formatMonthYear(fiDate) : "Belum terproyeksi",
      avgMonthlySurplus: Math.round(avgMonthlySurplus),
      hasPositiveSurplus,
      scenarios,
    }
  }, [netWorth, monthlyData])

  const animatedProgress = useCountUp(fi?.ready ? Math.round(fi.fiProgress * 10) : 0, 1200) / 10

  if (!fi?.ready) {
    return (
      <section className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in" aria-labelledby="fi-card-title-empty">
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={14} className="text-earth-400" aria-hidden="true" />
          <h2 id="fi-card-title-empty" className="text-xs font-bold uppercase tracking-wider text-earth-700">Financial Independence</h2>
        </div>
        <p className="text-sm text-earth-700">{fi?.message}</p>
        <p className="text-xs text-earth-600 mt-3 flex items-center gap-1">
          <Info size={12} aria-hidden="true" /> Berdasarkan aturan 4% atau 25x pengeluaran tahunan.
        </p>
      </section>
    )
  }

  const progressColor = fi.fiProgress >= 50 ? THEME.income : fi.fiProgress >= 20 ? THEME.savings : THEME.primary
  const progressValue = Math.max(0, Math.min(100, animatedProgress))

  return (
    <>
      <section className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in" aria-labelledby="fi-card-title">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Target size={14} color={THEME.primary} aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-wider text-earth-700">Financial Independence</p>
            </div>
            <h2 id="fi-card-title" className="text-lg font-display font-bold text-earth-800">Target Kebebasan Finansial</h2>
            <p className="text-xs text-earth-600 mt-1">Berdasarkan rata-rata {fi.windowSize} bulan terakhir.</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: progressColor + "18", color: progressColor }}>
            {fi.fiProgress.toFixed(1)}% dari target
          </span>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{ background: THEME.surfaceMuted }}>
          <p className="text-xs font-bold uppercase tracking-wider text-earth-700 mb-1">FI Number (25x pengeluaran tahunan)</p>
          <p className="text-2xl font-display font-bold" style={{ color: progressColor }}>
            {formatRpFull(fi.fiNumber)}
          </p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5 gap-3">
            <span className="font-semibold text-earth-700">Net worth: {formatRp(fi.netWorth)}</span>
            <span className="font-semibold text-earth-700">Sisa: {formatRp(fi.remaining)}</span>
          </div>
          <div
            className="h-3 rounded-full overflow-hidden"
            style={{ background: THEME.surfaceWarm }}
            role="progressbar"
            aria-label="Progres menuju Financial Independence"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={String(Math.round(progressValue))}
            aria-valuetext={`${fi.fiProgress.toFixed(1)} persen tercapai. Sisa target ${formatRp(fi.remaining)}.`}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressValue}%`,
                background: `linear-gradient(90deg, ${THEME.primary}, ${progressColor})`,
                transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1 px-0.5">
            {[0, 25, 50, 75, 100].map((m) => (
              <div key={m} className="flex flex-col items-center">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: fi.fiProgress >= m ? progressColor : THEME.surfaceWarm }}
                />
                <span className="text-[10px] text-earth-600 mt-0.5">{m}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="rounded-xl p-3" style={{ background: THEME.primaryBg }}>
            <div className="flex items-center gap-1 mb-1">
              <Clock size={12} color={THEME.primary} aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-earth-700">Estimasi FI</p>
            </div>
            <p className="text-sm font-bold" style={{ color: THEME.primary }}>
              {fi.fiDate}
            </p>
            {fi.isFIAchieved ? (
              <p className="text-[11px] text-earth-700 mt-1">Target FI tercapai.</p>
            ) : fi.yearsToFI ? (
              <p className="text-[11px] text-earth-700 mt-1">{fi.yearsToFI} tahun lagi</p>
            ) : (
              <p className="text-[11px] text-earth-700 mt-1">Butuh surplus bulanan positif agar bisa diproyeksikan.</p>
            )}
          </div>
          <div className="rounded-xl p-3" style={{ background: THEME.savingsBg }}>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp size={12} color={THEME.savings} aria-hidden="true" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-earth-700">Surplus/bulan</p>
            </div>
            <p className="text-sm font-bold text-earth-800">
              {formatRp(fi.avgMonthlySurplus)}
            </p>
            <p className="text-[11px] text-earth-700 mt-1">rata-rata surplus arus kas</p>
          </div>
        </div>

        {fi.isNetWorthNegative && (
          <p className="text-xs text-earth-700 mb-4 rounded-2xl p-3" style={{ background: THEME.expenseBg }}>
            Net worth masih negatif. Fokus dulu pada pelunasan utang dan membangun surplus bulanan yang stabil.
          </p>
        )}

        {fi.scenarios.length > 0 && (
          <div className="rounded-2xl p-3 border border-earth-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={12} color={THEME.warning} aria-hidden="true" />
              <p className="text-xs font-bold text-earth-800">Jika surplus lebih besar:</p>
            </div>
            <div className="space-y-2">
              {fi.scenarios.map((s) => (
                <div key={s.pct} className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-earth-700">+{s.pct}% surplus bulanan</span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-bold" style={{ color: THEME.income }}>
                      {s.yearsSaved} tahun lebih cepat
                    </span>
                    <span className="text-earth-600">Target: {s.newDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl p-3 border border-earth-200" style={{ background: THEME.surfaceWarm }}>
          <p className="text-xs font-semibold text-earth-800">Estimasi edukatif, bukan jaminan atau nasihat investasi.</p>
          <p className="text-[11px] text-earth-700 mt-1 leading-relaxed">
            Tidak menghitung inflasi, return investasi, pajak, biaya, atau perubahan gaya hidup. Hasil ini memakai net worth saat ini dan surplus rata-rata {fi.windowSize} bulan terakhir.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-earth-600 flex items-center gap-1">
            <Info size={12} aria-hidden="true" /> Lihat asumsi dan rumus lengkap.
          </p>
          <button
            type="button"
            onClick={() => setFormulaOpen(true)}
            className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
            style={{ background: THEME.primary }}
            aria-label="Pelajari rumus FI"
          >
            Pelajari rumus FI
          </button>
        </div>
      </section>

      <Sheet
        open={formulaOpen}
        onClose={() => setFormulaOpen(false)}
        title="Rumus Financial Independence"
        subtitle="Penjelasan"
        size="md"
        maxHeight="85vh"
        position="center"
      >
        <p className="text-sm text-earth-700 mb-4 leading-relaxed">
          Financial Independence (FI) di sini adalah estimasi edukatif berdasarkan aturan 4% atau target 25x pengeluaran tahunan.
        </p>
        <div className="space-y-3">
          {[
            { label: "FI Number", weight: "25x", desc: "Rata-rata pengeluaran bulanan dalam periode observasi dikali 12, lalu dikali 25. Ini adalah target aset yang dipakai sebagai patokan FI di kartu ini." },
            { label: "FI Progress", weight: "%", desc: "Net worth saat ini dibagi target FI. Progress visual dibatasi antara 0% sampai 100% agar mudah dibaca." },
            { label: "Estimasi FI", weight: "Tanggal", desc: "Perkiraan kasar kapan target FI tercapai berdasarkan surplus arus kas rata-rata per bulan. Jika surplus belum positif, tanggal belum bisa diproyeksikan." },
            { label: "Sensitivity", weight: "+10/20/30%", desc: "Simulasi sederhana jika surplus bulanan naik 10/20/30%. Ini bukan proyeksi investasi penuh." },
          ].map((row, i) => (
            <div key={i} className="rounded-2xl p-3" style={{ background: THEME.surfaceWarm }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-earth-800">{i + 1}. {row.label}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{row.weight}</span>
              </div>
              <p className="text-[10px] text-earth-600 leading-relaxed">{row.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl p-3 border border-earth-200" style={{ background: THEME.primaryBg }}>
          <p className="text-xs font-bold text-earth-800 mb-1">Asumsi penting:</p>
          <p className="text-[11px] text-earth-700 leading-relaxed">
            Aturan 4% hanyalah heuristik perencanaan. Hasil kartu ini tidak menghitung inflasi, return investasi, pajak, biaya, perubahan pengeluaran, atau risiko pasar. Gunakan sebagai patokan awal, bukan jaminan hasil pensiun.
          </p>
        </div>
        <p className="text-xs text-earth-700 mt-4 leading-relaxed">
          Estimasi edukatif, bukan jaminan atau nasihat investasi.
        </p>
      </Sheet>
    </>
  )
}
