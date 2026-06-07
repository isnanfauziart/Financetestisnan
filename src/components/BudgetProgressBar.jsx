"use client"
import { THEME } from "@/app/dashboard/_components/constants"

function colorFor(pct) {
  if (pct >= 100) return THEME.danger
  if (pct >= 90) return THEME.expense
  if (pct >= 70) return THEME.warning
  return THEME.savings
}

export default function BudgetProgressBar({ spent, limit, height = 10 }) {
  const safeLimit = Math.max(limit, 1)
  const pct = Math.min(100, (spent / safeLimit) * 100)
  const color = colorFor(pct)
  const over = spent > limit
  return (
    <div className="w-full">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: THEME.surfaceWarm }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(pct)}% of budget used`}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: over ? `linear-gradient(90deg, ${THEME.expense}, ${THEME.danger})` : color,
          }}
        />
      </div>
      {over && (
        <p className="text-[10px] font-bold mt-1" style={{ color: THEME.danger }}>
          Over budget by {Math.round(((spent - limit) / limit) * 100)}%
        </p>
      )}
    </div>
  )
}
