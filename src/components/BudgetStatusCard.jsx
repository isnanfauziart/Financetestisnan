"use client"
import { useEffect, useMemo, useState } from "react"
import { Target, ArrowRight } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"

function statusColor(pct) {
  if (pct >= 100) return THEME.danger
  if (pct >= 90) return THEME.expense
  if (pct >= 70) return THEME.warning
  return THEME.savings
}

function statusLabel(pct) {
  if (pct >= 100) return "Over"
  if (pct >= 90) return "Hampir"
  if (pct >= 70) return "Warning"
  return "Sehat"
}

export default function BudgetStatusCard({ filteredTransactions, setActiveNav }) {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  const currentMonth = AVAILABLE_MONTHS[new Date().getMonth()]
  const currentYear = String(new Date().getFullYear())

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ month: currentMonth, year: currentYear })
        const res = await fetch(`/api/budgets?${params.toString()}`)
        const data = await res.json()
        if (!cancelled) setBudgets(data.budgets || [])
      } catch {
        if (!cancelled) setBudgets([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentMonth, currentYear])

  const spentByCategory = useMemo(() => {
    const map = {}
    for (const t of (filteredTransactions || [])) {
      if (t.type !== "expense") continue
      map[t.category] = (map[t.category] || 0) + t.amount
    }
    return map
  }, [filteredTransactions])

  const urgentBudgets = useMemo(() => {
    if (budgets.length === 0) return []
    return budgets
      .map(b => {
        const spent = spentByCategory[b.kategori] || 0
        const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0
        return { ...b, spent, pct }
      })
      .filter(b => b.pct >= 70)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }, [budgets, spentByCategory])

  const overCount = useMemo(() => urgentBudgets.filter(b => b.pct >= 100).length, [urgentBudgets])
  const hampirCount = useMemo(() => urgentBudgets.filter(b => b.pct >= 90 && b.pct < 100).length, [urgentBudgets])

  if (loading) {
    return (
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in stagger-7">
        <div className="shimmer-bg rounded-2xl h-24" aria-hidden="true" />
      </div>
    )
  }

  if (budgets.length === 0) return null

  return (
    <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in stagger-7">
      <div className="flex justify-between items-center mb-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <Target size={14} color={THEME.primary} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Budget Status</h3>
          <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">· {currentMonth}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {overCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: THEME.danger + "18", color: THEME.danger }}>
              {overCount} over
            </span>
          )}
          {hampirCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: THEME.expense + "18", color: THEME.expense }}>
              {hampirCount} hampir
            </span>
          )}
          <button onClick={() => setActiveNav("stats")} aria-label="Open budget details in Statistics" className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all">
            Detail <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {urgentBudgets.length === 0 ? (
        <p className="text-[11px] text-earth-500 py-2">Semua budget sehat bulan ini 🎉</p>
      ) : (
        <div className="space-y-2.5">
          {urgentBudgets.map((b) => {
            const color = statusColor(b.pct)
            return (
              <button
                key={`${b.kategori}|${b.bulan}|${b.tahun}|${b.akun || ""}`}
                onClick={() => setActiveNav("stats")}
                aria-label={`Open ${b.kategori} budget details`}
                className="w-full text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="font-bold text-earth-800 truncate">{b.kategori}</span>
                  <span className="font-bold flex items-center gap-1.5 flex-shrink-0" style={{ color }}>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: color + "18", color }}>
                      {statusLabel(b.pct)}
                    </span>
                    {b.pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: THEME.surfaceWarm }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, b.pct)}%`, background: color }}
                  />
                </div>
                <p className="text-[10px] text-earth-500 mt-1">
                  {formatRp(b.spent)} <span className="text-earth-400">/ {formatRp(b.limit)}</span>
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}