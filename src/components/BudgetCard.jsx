"use client"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"
import { getCategoryVisual } from "@/lib/categoryIcons"
import RowActionsMenu from "@/app/dashboard/_components/RowActionsMenu"
import BudgetProgressBar from "./BudgetProgressBar"
import { computeBudgetPace } from "@/lib/budgetPace"

function statusLabel(pct) {
  if (pct >= 100) return { text: "Over", color: THEME.danger }
  if (pct >= 90) return { text: "Hampir", color: THEME.expense }
  if (pct >= 70) return { text: "Warning", color: THEME.warning }
  return { text: "Sehat", color: THEME.savings }
}

export default function BudgetCard({ budget, spent, onClick, onEdit, onDelete, categoryMeta, now }) {
  const safeLimit = Math.max(budget.limit, 1)
  const pct = (spent / safeLimit) * 100
  const status = statusLabel(pct)
  const { icon: CategoryIcon, tint } = getCategoryVisual(budget.kategori, categoryMeta)
  const pace = computeBudgetPace({ ...budget, spent, now })

  return (
    <div
      className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 shadow-warm transition-[box-shadow] hover:shadow-pop group"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <button
          onClick={onClick}
          aria-label={`View ${budget.kategori} transactions`}
          className="flex-1 min-w-0 min-h-11 text-left"
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
                <p className="text-sm font-bold text-md3-on-surface truncate">{budget.kategori}</p>
                {budget.akun && (
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-md3-surface text-md3-on-surface-variant flex-shrink-0">
                    {budget.akun}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-md3-on-surface-variant tabular-nums">
                <span className="font-semibold">{formatRp(spent)}</span> <span>/ {formatRp(budget.limit)}</span>
              </p>
            </div>
          </div>
        </button>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: status.color + "18", color: status.color }}>
            {status.text}
          </span>
          <RowActionsMenu
            onEdit={onEdit}
            onDelete={onDelete}
            menuLabel={`Aksi budget ${budget.kategori}`}
            editLabel={`Edit ${budget.kategori} budget`}
            deleteLabel={`Delete ${budget.kategori} budget`}
          />
        </div>
      </div>
      <button onClick={onClick} className="w-full min-h-11 text-left" aria-label={`Open ${budget.kategori} drill-down`}>
        <BudgetProgressBar spent={spent} limit={budget.limit} />
        <p className="text-[10px] text-md3-on-surface-variant mt-1.5 text-right font-semibold">{Math.round(pct)}% used</p>
        {pace?.status === "active" && (
          <p className="text-[10px] text-md3-on-surface-variant mt-1 text-left">
            Sisa {formatRp(pace.remaining)} · sekitar {formatRp(pace.dailyRoom)}/hari
          </p>
        )}
        {pace?.status === "over" && (
          <p className="text-[10px] font-semibold mt-1 text-left" style={{ color: THEME.danger }}>
            Melebihi {formatRp(pace.exceeded)}
          </p>
        )}
      </button>
    </div>
  )
}
