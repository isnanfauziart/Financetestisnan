"use client"
import { THEME } from "@/app/dashboard/_components/constants"

function colorFor(pct) {
  if (pct >= 100) return THEME.danger
  if (pct >= 90) return THEME.expense
  if (pct >= 70) return THEME.warning
  return THEME.savings
}

export default function BudgetProgressBar({ spent, limit, height = 10, expectedSpent = null, paceStatus = null }) {
  const safeLimit = Math.max(limit, 1)
  const pct = Math.min(100, (spent / safeLimit) * 100)
  const color = colorFor(pct)
  const over = spent > limit
  const expectedPct = expectedSpent !== null && expectedSpent !== undefined && Number.isFinite(Number(expectedSpent))
    ? Math.min(100, Math.max(0, (Number(expectedSpent) / safeLimit) * 100))
    : null
  const paceLabel = paceStatus === "faster" ? "Lebih cepat dari ritme bulan ini" : paceStatus === "slower" ? "Lebih lambat dari ritme bulan ini" : paceStatus === "steady" ? "Sesuai ritme bulan ini" : null
  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height: height + 6 }}>
        <div
          className="absolute inset-x-0 top-[3px] overflow-hidden rounded-full"
          style={{ height, background: THEME.surfaceWarm }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${pct}%`,
              background: over ? `linear-gradient(90deg, ${THEME.expense}, ${THEME.danger})` : color,
            }}
          />
        </div>
        {expectedPct !== null && (
          <span
            data-budget-pace-marker="true"
            className="absolute top-0 z-10 h-4 w-px"
            style={{ left: `${expectedPct}%`, background: THEME.textPrimary }}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-x-0 top-0 h-5 rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.round(pct)}% of budget used`}
        />
      </div>
      {paceLabel && (
        <p className="plan-card__meta mt-0.5 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: paceStatus === "faster" ? THEME.warning : paceStatus === "slower" ? THEME.savings : THEME.textTertiary }} aria-hidden="true" />
          {paceLabel}
        </p>
      )}
      {over && (
        <p className="text-[10px] font-bold mt-1" style={{ color: THEME.danger }}>
          Over budget by {Math.round(((spent - limit) / limit) * 100)}%
        </p>
      )}
    </div>
  )
}
