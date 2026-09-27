"use client"
import { getChartSchemeIsDark, resolveChartTheme } from "@/lib/chartTheme"

/**
 * Unified stat tile (revamp C) for metric rows — CashFlowForecast KPI cards
 * and SavingsRateTrend stats share one visual language: tinted surface,
 * colored value, consistent label scale.
 */
export default function StatTile({ label, value, tone = "neutral" }) {
  const theme = resolveChartTheme(getChartSchemeIsDark())

  const tones = {
    income: { background: theme.tintIncome, color: theme.income },
    expense: { background: theme.tintExpense, color: theme.expense },
    savings: { background: theme.tintSavings, color: theme.savings },
    warning: { background: theme.tintWarning, color: theme.warning },
    danger: { background: theme.tintDanger, color: theme.danger },
    primary: { background: theme.tintPrimary, color: theme.primary },
    neutral: { background: theme.surfaceMuted, color: theme.textPrimary },
  }

  const style = tones[tone] || tones.neutral

  return (
    <div className="rounded-2xl p-3" style={{ background: style.background }}>
      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.textSecondary }}>{label}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color: style.color }}>{value}</p>
    </div>
  )
}
