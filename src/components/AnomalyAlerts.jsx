"use client"
import { useMemo } from "react"
import { AlertTriangle, TrendingUp, ChevronRight } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"

function getPrevMonths(month, year, count) {
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx < 0) return []
  const result = []
  let m = idx
  let y = parseInt(year, 10)
  for (let i = 0; i < count; i++) {
    m--
    if (m < 0) { m = 11; y-- }
    result.push({ month: AVAILABLE_MONTHS[m], year: String(y) })
  }
  return result
}

function getDaysInMonth(month, year) {
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx < 0) return 30
  return new Date(parseInt(year, 10), idx + 1, 0).getDate()
}

function getCurrentDayInMonth(month, year) {
  const now = new Date()
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx < 0) return 30
  if (parseInt(year, 10) !== now.getFullYear() || idx !== now.getMonth()) {
    return getDaysInMonth(month, year)
  }
  return now.getDate()
}

export default function AnomalyAlerts({ transactions, selectedMonth, selectedYear, onCategoryClick }) {
  const anomalies = useMemo(() => {
    if (!transactions || transactions.length === 0) return []
    if (!selectedMonth || selectedMonth === "Semua Bulan") return []
    if (!selectedYear || selectedYear === "Semua Tahun") return []

    const currentMonth = selectedMonth
    const currentYear = selectedYear

    const prevMonths = getPrevMonths(currentMonth, currentYear, 3)
    if (prevMonths.length === 0) return []

    const currentSpend = {}
    const prevSpendByMonth = {}

    for (const t of transactions) {
      if (t.type !== "expense") continue
      const key = `${t.month} ${t.year}`
      const isCurrent = t.month === currentMonth && t.year === currentYear
      if (isCurrent) {
        currentSpend[t.category] = (currentSpend[t.category] || 0) + t.amount
      } else {
        for (const pm of prevMonths) {
          if (t.month === pm.month && t.year === pm.year) {
            if (!prevSpendByMonth[t.category]) prevSpendByMonth[t.category] = {}
            prevSpendByMonth[t.category][key] = (prevSpendByMonth[t.category][key] || 0) + t.amount
          }
        }
      }
    }

    const results = []
    const daysInCurrent = getDaysInMonth(currentMonth, currentYear)
    const currentDay = getCurrentDayInMonth(currentMonth, currentYear)
    const monthProgress = currentDay / daysInCurrent

    for (const [cat, current] of Object.entries(currentSpend)) {
      if (current <= 0) continue

      const prevMonthsData = prevSpendByMonth[cat] || {}
      const prevValues = Object.values(prevMonthsData)

      if (prevValues.length === 0) continue

      const avg = prevValues.reduce((s, v) => s + v, 0) / prevValues.length
      if (avg <= 0) continue

      const ratio = current / avg
      if (ratio < 1.3) continue

      const projectedAtCurrentRate = monthProgress > 0 ? current / monthProgress : current
      const projectedRatio = projectedAtCurrentRate / avg

      results.push({
        category: cat,
        current,
        avg: Math.round(avg),
        ratio,
        delta: ((ratio - 1) * 100).toFixed(0),
        projectedAtCurrentRate: Math.round(projectedAtCurrentRate),
        projectedDelta: ((projectedRatio - 1) * 100).toFixed(0),
        monthProgress: Math.round(monthProgress * 100),
        prevMonthsCount: prevValues.length,
        severity: ratio >= 2 ? "critical" : ratio >= 1.5 ? "high" : "medium",
      })
    }

    return results.sort((a, b) => b.ratio - a.ratio)
  }, [transactions, selectedMonth, selectedYear])

  if (anomalies.length === 0) return null

  const severityColors = {
    critical: { bg: THEME.dangerBg, border: THEME.danger + "30", text: THEME.danger, label: "Kritis" },
    high: { bg: THEME.expenseBg, border: THEME.expense + "30", text: THEME.expense, label: "Tinggi" },
    medium: { bg: THEME.warningBg, border: THEME.warning + "30", text: THEME.warning, label: "Perhatian" },
  }

  return (
    <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={14} color={THEME.warning} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Perhatian</h3>
          <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">· {selectedMonth}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: THEME.warningBg, color: THEME.warning }}>
          {anomalies.length} anomali
        </span>
      </div>

      <div className="space-y-2.5">
        {anomalies.map((a) => {
          const sev = severityColors[a.severity]
          return (
            <button
              key={a.category}
              onClick={() => onCategoryClick?.(a.category)}
              className="w-full text-left rounded-2xl p-3 border transition-all active:scale-[0.99] hover:shadow-sm"
              style={{ background: sev.bg, borderColor: sev.border }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-bold truncate" style={{ color: sev.text }}>{a.category}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: sev.text + "18", color: sev.text }}>
                    {sev.label}
                  </span>
                </div>
                <ChevronRight size={12} className="text-earth-400 flex-shrink-0 ml-1" aria-hidden="true" />
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-bold" style={{ color: sev.text }}>+{a.delta}%</span>
                <span className="text-[10px] text-earth-500">di atas rata-rata 3 bulan</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-earth-500">
                <span>Bulan ini: <strong className="text-earth-700">{formatRp(a.current)}</strong></span>
                <span>Rata-rata: <strong className="text-earth-700">{formatRp(a.avg)}</strong></span>
              </div>

              {a.monthProgress < 80 && (
                <div className="mt-2 pt-2 border-t flex items-center gap-1.5" style={{ borderColor: sev.border }}>
                  <TrendingUp size={10} style={{ color: sev.text }} aria-hidden="true" />
                  <span className="text-[10px]" style={{ color: sev.text }}>
                    Proyeksi akhir bulan: <strong>{formatRp(a.projectedAtCurrentRate)}</strong> (+{a.projectedDelta}%)
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-earth-400 mt-3 px-0.5">
        Berdasarkan rata-rata 3 bulan terakhir. Ketuk kategori untuk filter.
      </p>
    </div>
  )
}
