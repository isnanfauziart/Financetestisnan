"use client"
import { Pencil, Trash2 } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { getCategoryVisual } from "@/lib/categoryIcons"
import BudgetProgressBar from "./BudgetProgressBar"

function statusLabel(pct) {
  if (pct >= 100) return { text: "Over", color: THEME.danger }
  if (pct >= 90) return { text: "Hampir", color: THEME.expense }
  if (pct >= 70) return { text: "Warning", color: THEME.warning }
  return { text: "Sehat", color: THEME.savings }
}

export default function BudgetCard({ budget, spent, onClick, onEdit, onDelete }) {
  const safeLimit = Math.max(budget.limit, 1)
  const pct = (spent / safeLimit) * 100
  const status = statusLabel(pct)
  const { icon: CategoryIcon, tint } = getCategoryVisual(budget.kategori)

  return (
    <div
      className="bento-tile bg-white border border-earth-100 p-4 shadow-warm transition-all hover:shadow-pop group"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <button
          onClick={onClick}
          aria-label={`View ${budget.kategori} transactions`}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
              style={{ background: tint.bg, color: tint.color }}
            >
              <CategoryIcon size={17} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <p className="text-sm font-bold text-earth-800 truncate">{budget.kategori}</p>
                {budget.akun && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-earth-50 text-earth-600 flex-shrink-0">
                    {budget.akun}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-earth-500">
                {formatRp(spent)} <span className="text-earth-400">/ {formatRp(budget.limit)}</span>
              </p>
            </div>
          </div>
        </button>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: status.color + "18", color: status.color }}>
            {status.text}
          </span>
          <div className="flex gap-0.5 opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} aria-label={`Edit ${budget.kategori} budget`} className="w-6 h-6 rounded-lg bg-earth-50 hover:bg-violet-100 flex items-center justify-center text-earth-500 hover:text-violet-600">
              <Pencil size={11} aria-hidden="true" />
            </button>
            <button onClick={onDelete} aria-label={`Delete ${budget.kategori} budget`} className="w-6 h-6 rounded-lg bg-earth-50 hover:bg-rose-100 flex items-center justify-center text-earth-500 hover:text-rose-500">
              <Trash2 size={11} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <button onClick={onClick} className="w-full text-left" aria-label={`Open ${budget.kategori} drill-down`}>
        <BudgetProgressBar spent={spent} limit={budget.limit} />
        <p className="text-[10px] text-earth-500 mt-1.5 text-right font-semibold">{Math.round(pct)}% used</p>
      </button>
    </div>
  )
}
