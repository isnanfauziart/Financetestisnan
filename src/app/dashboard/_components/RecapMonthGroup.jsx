"use client"
import { ChevronDown } from "lucide-react"
import { THEME } from "./constants"
import { formatRp, formatShortDate } from "./helpers"
import { isSpecialExpense } from "@/lib/expenseClass"

const PAGE_SIZE = 10

function typeColor(type) {
  if (type === "income") return THEME.income
  if (type === "savings") return THEME.savings
  return THEME.expense
}

function typeBg(type) {
  if (type === "income") return THEME.incomeBg
  if (type === "savings") return THEME.savingsBg
  return THEME.expenseBg
}

function SummaryChip({ label, value, color, bg }) {
  return (
    <div className="flex-1 rounded-2xl px-2.5 py-2 min-w-0" style={{ background: bg }}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-0.5 truncate" style={{ color }}>
        {label}
      </p>
      <p className="text-[11px] font-bold truncate" style={{ color }}>{formatRp(value)}</p>
    </div>
  )
}

function SpecialBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
      Spesial
    </span>
  )
}

function Pager({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) pages.push(i)
  return (
    <div className="flex items-center justify-center gap-1 pt-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="w-8 h-8 rounded-xl bg-md3-surface hover:bg-md3-surface-container-high disabled:opacity-30 disabled:hover:bg-md3-surface transition-colors flex items-center justify-center text-md3-on-surface-variant text-sm font-bold"
      >
        ‹
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? "page" : undefined}
          className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all ${
            p === page ? "bg-earth-800 text-white shadow-warm" : "bg-md3-surface text-md3-on-surface-variant hover:bg-md3-surface-container-high"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className="w-8 h-8 rounded-xl bg-md3-surface hover:bg-md3-surface-container-high disabled:opacity-30 disabled:hover:bg-md3-surface transition-colors flex items-center justify-center text-md3-on-surface-variant text-sm font-bold"
      >
        ›
      </button>
    </div>
  )
}

export default function RecapMonthGroup({
  month,
  year,
  transactions,
  totals,
  page,
  expanded,
  onToggle,
  onPageChange,
  onEdit,
  onDelete,
}) {
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageEnd = pageStart + PAGE_SIZE
  const visible = transactions.slice(pageStart, pageEnd)

  const headerKey = `${month} ${year}`

  return (
    <div className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant shadow-warm overflow-hidden">
      <button
        onClick={onToggle}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${headerKey}`}
        aria-expanded={expanded}
        className="w-full px-4 py-3 flex items-center justify-between text-left active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ChevronDown
            size={16}
            className={`transition-transform duration-300 flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          <h4 className="text-sm font-display font-bold text-md3-on-surface truncate">{headerKey}</h4>
          <span className="text-[10px] font-bold text-md3-on-surface-variant uppercase tracking-wider flex-shrink-0">
            · {transactions.length} tx
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {totals.income > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.income }} aria-hidden="true" />}
          {totals.expense > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.expense }} aria-hidden="true" />}
          {totals.savings > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{ background: THEME.savings }} aria-hidden="true" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-slide-down">
          <div className="grid grid-cols-2 gap-1.5 mb-2 sm:grid-cols-4">
            <SummaryChip label="Income" value={totals.income} color={THEME.income} bg={THEME.incomeBg} />
            <SummaryChip label="Savings" value={totals.savings} color={THEME.savings} bg={THEME.savingsBg} />
            <SummaryChip
              label="Net"
              value={totals.net}
              color={totals.net >= 0 ? THEME.income : THEME.danger}
              bg={THEME.surfaceWarm}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <SummaryChip label="Aktual" value={totals.actualExpense ?? totals.expense} color={THEME.expense} bg={THEME.expenseBg} />
            <SummaryChip label="Rutin" value={totals.routineExpense ?? totals.expense} color={THEME.textPrimary} bg={THEME.surfaceWarm} />
            <SummaryChip label="Spesial" value={totals.specialExpense ?? 0} color={THEME.primary} bg={THEME.primaryBg} />
          </div>

          {visible.length === 0 ? (
            <p className="text-xs text-md3-on-surface-variant text-center py-4">Tidak ada transaksi pada halaman ini.</p>
          ) : (
            <div className="space-y-1.5">
              {visible.map((t, i) => {
                const borderColor = typeColor(t.type)
                const bg = typeBg(t.type)
                const special = isSpecialExpense(t)
                return (
                  <div
                    key={`${t.id}-${i}`}
                    className="group flex items-center justify-between pl-3 pr-1.5 py-2 rounded-2xl border-l-4 transition-colors"
                    style={{ borderLeftColor: borderColor, background: bg + "80" }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-md3-surface-container-lowest flex items-center justify-center font-bold text-[11px] text-md3-on-surface-variant text-center leading-tight flex-shrink-0">
                        {formatShortDate(t.date)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-semibold text-sm text-md3-on-surface truncate">{t.category}</p>
                          {special && <SpecialBadge />}
                        </div>
                        <p className="text-[10px] text-md3-on-surface-variant mt-0.5 truncate">
                          {t.desc || (t.type === "income" ? "Pemasukan" : t.type === "savings" ? "Tabungan" : "Pengeluaran")}
                          {t.account ? ` · ${t.account}` : ""}
                        </p>
                      </div>
                    </div>
                    <p
                      className="font-bold text-sm flex-shrink-0 ml-2"
                      style={{ color: borderColor }}
                    >
                      {t.type === "income" ? "+" : t.type === "savings" ? "" : "-"}{formatRp(t.amount)}
                    </p>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => onEdit(t)}
                        aria-label={`Edit ${t.category}`}
                        className="w-8 h-8 rounded-lg bg-md3-surface-container-lowest hover:bg-violet-100 flex items-center justify-center text-md3-on-surface-variant hover:text-violet-600 transition-colors text-xs font-bold"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDelete(t)}
                        aria-label={`Delete ${t.category}`}
                        className="w-8 h-8 rounded-lg bg-md3-surface-container-lowest hover:bg-rose-100 flex items-center justify-center text-md3-on-surface-variant hover:text-rose-500 transition-colors text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Pager page={safePage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  )
}
