"use client"
import { useMemo } from "react"
import { Target, TrendingUp, Clock, Zap, Info } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull, useCountUp } from "@/app/dashboard/_components/helpers"

export default function FITrackerCard({ netWorth, monthlyData }) {
  const fi = useMemo(() => {
    if (!monthlyData || monthlyData.length < 2) return null

    const withExpense = monthlyData.filter(m => m.pengeluaran > 0)
    if (withExpense.length === 0) return null

    const avgMonthlyExpense = withExpense.reduce((s, m) => s + m.pengeluaran, 0) / withExpense.length
    const annualExpenses = avgMonthlyExpense * 12
    const fiNumber = annualExpenses * 25
    const fiProgress = fiNumber > 0 ? (netWorth / fiNumber) * 100 : 0

    const withIncome = monthlyData.filter(m => m.pemasukan > 0)
    const avgMonthlyIncome = withIncome.length > 0
      ? withIncome.reduce((s, m) => s + m.pemasukan, 0) / withIncome.length
      : 0
    const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpense

    const remaining = fiNumber - netWorth
    const monthsToFI = avgMonthlySavings > 0 ? remaining / avgMonthlySavings : Infinity
    const yearsToFI = isFinite(monthsToFI) ? monthsToFI / 12 : Infinity

    const now = new Date()
    const fiDate = new Date(now)
    if (isFinite(monthsToFI)) {
      fiDate.setMonth(fiDate.getMonth() + Math.ceil(monthsToFI))
    }

    const formatDate = (d) => {
      if (!isFinite(monthsToFI) || d > new Date(now.getFullYear() + 50, 0, 1)) return "—"
      return `${AVAILABLE_MONTHS[d.getMonth()]} ${d.getFullYear()}`
    }

    const scenarios = []
    if (isFinite(monthsToFI) && avgMonthlySavings > 0) {
      for (const pct of [10, 20, 30]) {
        const extraSavings = avgMonthlySavings * (pct / 100)
        const newMonthly = avgMonthlySavings + extraSavings
        const newMonths = remaining / newMonthly
        const newYears = newMonths / 12
        const yearsSaved = yearsToFI - newYears
        if (yearsSaved > 0.1) {
          const newDate = new Date(now)
          newDate.setMonth(newDate.getMonth() + Math.ceil(newMonths))
          scenarios.push({
            pct,
            yearsSaved: yearsSaved.toFixed(1),
            newDate: formatDate(newDate),
          })
        }
      }
    }

    return {
      fiNumber: Math.round(fiNumber),
      fiProgress: Math.min(100, fiProgress),
      netWorth,
      remaining: Math.max(0, remaining),
      monthsToFI: isFinite(monthsToFI) ? Math.ceil(monthsToFI) : null,
      yearsToFI: isFinite(yearsToFI) ? yearsToFI.toFixed(1) : null,
      fiDate: formatDate(fiDate),
      avgMonthlySavings: Math.round(avgMonthlySavings),
      scenarios,
    }
  }, [netWorth, monthlyData])

  const animatedProgress = useCountUp(fi ? Math.round(fi.fiProgress * 10) : 0, 1200) / 10

  if (!fi) {
    return (
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Financial Independence</p>
        </div>
        <p className="text-sm text-earth-500">Butuh minimal 2 bulan data untuk menghitung FI.</p>
      </div>
    )
  }

  const progressColor = fi.fiProgress >= 50 ? THEME.income : fi.fiProgress >= 20 ? THEME.savings : THEME.primary

  return (
    <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Target size={14} color={THEME.primary} aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Financial Independence</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: progressColor + "18", color: progressColor }}>
          {fi.fiProgress.toFixed(1)}% to FI
        </span>
      </div>

      {/* FI Number */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: THEME.surfaceMuted }}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-earth-500 mb-1">FI Number (25× pengeluaran tahunan)</p>
        <p className="text-2xl font-display font-bold" style={{ color: progressColor }}>
          {formatRpFull(fi.fiNumber)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[10px] mb-1.5">
          <span className="font-semibold text-earth-600">Net Worth: {formatRp(fi.netWorth)}</span>
          <span className="font-semibold text-earth-500">Sisa: {formatRp(fi.remaining)}</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: THEME.surfaceWarm }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(100, animatedProgress)}%`,
              background: `linear-gradient(90deg, ${THEME.primary}, ${progressColor})`,
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
        {/* Milestone markers */}
        <div className="flex justify-between mt-1 px-0.5">
          {[0, 25, 50, 75, 100].map(m => (
            <div key={m} className="flex flex-col items-center">
              <div
                className="w-1 h-1 rounded-full"
                style={{ background: fi.fiProgress >= m ? progressColor : THEME.surfaceWarm }}
              />
              <span className="text-[7px] text-earth-400 mt-0.5">{m}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="rounded-xl p-3" style={{ background: THEME.primaryBg }}>
          <div className="flex items-center gap-1 mb-0.5">
            <Clock size={10} color={THEME.primary} aria-hidden="true" />
            <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500">Est. FI Date</p>
          </div>
          <p className="text-sm font-bold" style={{ color: THEME.primary }}>
            {fi.fiDate}
          </p>
          {fi.yearsToFI && (
            <p className="text-[9px] text-earth-500 mt-0.5">{fi.yearsToFI} tahun lagi</p>
          )}
        </div>
        <div className="rounded-xl p-3" style={{ background: THEME.savingsBg }}>
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp size={10} color={THEME.savings} aria-hidden="true" />
            <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500">Tabungan/bulan</p>
          </div>
          <p className="text-sm font-bold" style={{ color: THEME.savings }}>
            {formatRp(fi.avgMonthlySavings)}
          </p>
          <p className="text-[9px] text-earth-500 mt-0.5">rata-rata surplus</p>
        </div>
      </div>

      {/* Sensitivity scenarios */}
      {fi.scenarios.length > 0 && (
        <div className="rounded-2xl p-3 border border-earth-200">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={10} color={THEME.warning} aria-hidden="true" />
            <p className="text-[10px] font-bold text-earth-700">Jika simpan lebih banyak:</p>
          </div>
          <div className="space-y-1.5">
            {fi.scenarios.map(s => (
              <div key={s.pct} className="flex items-center justify-between text-[10px]">
                <span className="text-earth-600">
                  +{s.pct}% tabungan
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold" style={{ color: THEME.income }}>
                    {s.yearsSaved} tahun lebih cepat
                  </span>
                  <span className="text-earth-400">→ {s.newDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-earth-400 mt-3 flex items-center gap-1">
        <Info size={10} aria-hidden="true" /> Berdasarkan aturan 4% (25× pengeluaran tahunan)
      </p>
    </div>
  )
}
