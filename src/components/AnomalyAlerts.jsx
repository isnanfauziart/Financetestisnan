"use client"
import { useMemo } from "react"
import { AlertTriangle, TrendingUp, ChevronRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { detectAnomalies, getPrevMonths } from "@/lib/anomalies"

/**
 * Compact horizontal bar showing the current spend against the 3-month
 * average (revamp C). The bar never implies the direction — the delta chip
 * with its arrow carries the meaning, satisfying "color is not the only
 * indicator".
 */
function CurrentVsAverageBar({ current, average, color }) {
  const scale = Math.max(current, average, 1)
  const width = Math.min(100, (current / scale) * 100)
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: THEME.surfaceWarm }} aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
    </div>
  )
}

export default function AnomalyAlerts({ transactions, selectedMonth, selectedYear, onCategoryClick }) {
  const anomalies = useMemo(
    () => detectAnomalies({ transactions, month: selectedMonth, year: selectedYear }),
    [transactions, selectedMonth, selectedYear],
  )

  if (anomalies.length === 0) return null

  // Wave 8 — name the actual baseline months so the result is explainable.
  const baselineMonths = getPrevMonths(selectedMonth, selectedYear, 3)
  const baselineLabel = [...baselineMonths].reverse().map((m) => `${m.month} ${m.year}`).join(", ")

  const severityColors = {
    critical: { bg: THEME.dangerBg, border: THEME.danger + "30", text: THEME.danger, label: "Kritis" },
    high: { bg: THEME.expenseBg, border: THEME.expense + "30", text: THEME.expense, label: "Tinggi" },
    medium: { bg: THEME.warningBg, border: THEME.warning + "30", text: THEME.warning, label: "Perhatian" },
  }

  return (
    <div className="mt-6 bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm animate-bento-in">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={14} color={THEME.warning} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-md3-on-surface">Perhatian</h3>
          <span className="text-[10px] font-bold text-md3-on-surface-variant uppercase tracking-wider">· {selectedMonth}</span>
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
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: sev.text + "18", color: sev.text }}>
                    {sev.label}
                  </span>
                </div>
                <ChevronRight size={12} className="text-earth-400 flex-shrink-0 ml-1" aria-hidden="true" />
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-bold" style={{ color: sev.text }}>+{a.delta}%</span>
                <span className="text-[10px] text-md3-on-surface-variant">di atas rata-rata 3 bulan</span>
              </div>

              <CurrentVsAverageBar current={a.current} average={a.avg} color={sev.text} />

              <div className="mt-1.5 flex items-center justify-between text-[10px] text-md3-on-surface-variant">
                <span>Bulan ini: <strong className="text-md3-on-surface-variant">{formatRp(a.current)}</strong></span>
                <span>Rata-rata: <strong className="text-md3-on-surface-variant">{formatRp(a.avg)}</strong></span>
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
        {baselineMonths.length > 0
          ? `Berdasarkan rata-rata ${baselineLabel}. Pengeluaran Spesial tidak diikutkan. Ketuk kategori untuk filter.`
          : "Ketuk kategori untuk filter."}
      </p>
    </div>
  )
}
