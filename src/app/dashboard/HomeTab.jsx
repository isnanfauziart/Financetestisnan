"use client"
import { useMemo } from "react"
import { Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Sparkles, ArrowRight, Clock3, AlertTriangle, PlusCircle } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRp, formatRpFull, useCountUpOvershoot } from "./_components/helpers"
import EmptyState from "./_components/EmptyState"
import BudgetStatusCard from "@/components/BudgetStatusCard"
import HealthScoreCard from "@/components/HealthScoreCard"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import { useBudgets, useBills, useSettings } from "@/lib/useSharedData"
import { getFocusNote } from "./_components/focusNote"
import { hasFeature, isFeatureEnabled } from "@/lib/featureAccess"
import { isSpecialExpense } from "@/lib/expenseClass"

function SpecialBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
      Spesial
    </span>
  )
}

const INSIGHT_PRIORITY = { warning: 0, danger: 0, info: 1, positive: 2 }

function HomeInsightCard({ insight }) {
  const Icon = insight.icon || Sparkles
  const color = insight.color || THEME.smart

  return (
    <article className="rounded-2xl border border-earth-100 bg-earth-50/70 p-3 shadow-warm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white" style={{ color }}>
          <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-earth-800">{insight.text}</p>
      </div>
    </article>
  )
}

export default function HomeTab({
  data,
  statIncome, statExpense, statSavings,
  topCategory, topCategoryPct,
  recent5,
  setActiveNav, openPlanSection, openQuickAdd, setDrillDown,
  selectedMonth, selectedYear, monthlyData,
  allTransactions, filteredTransactions,
  insights,
  entitlement,
}) {
  const animatedBalance = useCountUpOvershoot(data?.netWorth || 0)
  const monthlyDelta = data?.netWorthMonthlyDelta || 0
  const cashFlowIncome = Number(statIncome) || 0
  const cashFlowExpense = Number(statExpense) || 0
  const cashFlowSavings = Number(statSavings) || 0
  const cashFlowBalance = cashFlowIncome - cashFlowExpense
  const cashFlowBalanceLabel = cashFlowBalance > 0 ? "Surplus" : cashFlowBalance < 0 ? "Defisit" : "Seimbang"
  const scopedTransactions = filteredTransactions ?? allTransactions ?? []
  const cashFlowPeriodLabel = selectedMonth && selectedYear && selectedMonth !== "Semua Bulan" && selectedYear !== "Semua Tahun"
    ? `${selectedMonth} ${selectedYear}`
    : "Periode yang dipilih"
  const deltaLabel = monthlyDelta >= 0 ? "Bertumbuh" : "Turun"
  const budgetMonth = selectedMonth && selectedMonth !== "Semua Bulan"
    ? selectedMonth
    : AVAILABLE_MONTHS[new Date().getMonth()]
  const budgetYear = selectedYear && selectedYear !== "Semua Tahun"
    ? selectedYear
    : String(new Date().getFullYear())
  const { budgets } = useBudgets(budgetMonth, budgetYear)
  const { bills } = useBills()
  const { settings } = useSettings()
  const visibleInsights = hasFeature(entitlement, "insights") ? insights : []
  const configuredSavings = settings?.categories?.savings
  const liquidSavingsCategories = Array.isArray(configuredSavings)
    ? configuredSavings.filter(item => (item.savingsKind || item.kind) === "liquid" && item.active !== false).map(item => typeof item === "string" ? item : item.name)
    : undefined

  const priorityActions = useMemo(() => {
    const actions = []

    const sortedBills = [...(bills || [])].sort((a, b) => (a.daysUntilDue || 0) - (b.daysUntilDue || 0))
    const urgentBill = sortedBills.find((bill) => bill.status === "overdue" || bill.status === "due_today" || bill.status === "due_soon")

    if (urgentBill) {
      actions.push({
        key: `bill-${urgentBill.id || urgentBill.nama}`,
        eyebrow: urgentBill.status === "overdue" ? "Tagihan terlambat" : urgentBill.status === "due_today" ? "Jatuh tempo hari ini" : "Jatuh tempo dekat",
        title: `Bayar tagihan ${urgentBill.nama}`,
        description: urgentBill.jumlah
          ? `${formatRp(urgentBill.jumlah)} • Buka Rencana untuk lanjut bayar.`
          : "Buka Rencana untuk cek dan selesaikan tagihan ini.",
        icon: Clock3,
        tint: "bg-rose-50 text-rose-600 border-rose-100",
        onClick: () => {
          setActiveNav("plan")
          openPlanSection?.("tagihan")
        },
        aria: `Bayar tagihan ${urgentBill.nama}`,
      })
    }

    const monthExpenses = (allTransactions || []).filter((t) =>
      t.type === "expense" && t.month === budgetMonth && String(t.year) === String(budgetYear)
    )
    const spentByCategory = monthExpenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount
      return acc
    }, {})
    const urgentBudget = (budgets || [])
      .map((budget) => {
        const spent = spentByCategory[budget.kategori] || 0
        const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0
        return { ...budget, spent, pct }
      })
      .filter((budget) => budget.limit > 0 && budget.pct >= 85)
      .sort((a, b) => b.pct - a.pct)[0]

    if (urgentBudget && actions.length < 2) {
      actions.push({
        key: `budget-${urgentBudget.kategori}`,
        eyebrow: urgentBudget.pct >= 100 ? "Budget jebol" : "Budget menipis",
        title: `Cek budget ${urgentBudget.kategori}`,
        description: `${urgentBudget.pct.toFixed(0)}% terpakai • Buka Rencana untuk cek dan atur budget.`,
        icon: AlertTriangle,
        tint: urgentBudget.pct >= 100 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-orange-50 text-orange-700 border-orange-100",
        onClick: () => {
          setActiveNav("plan")
          openPlanSection?.("budget")
        },
        aria: `Cek budget ${urgentBudget.kategori}`,
      })
    }

    if (actions.length === 0) {
      actions.push({
        key: "quick-add-expense",
        eyebrow: "Langkah cepat",
        title: "Tambah transaksi hari ini",
        description: "Catat pengeluaran atau pemasukan tanpa buka form penuh.",
        icon: PlusCircle,
        tint: "bg-violet-50 text-violet-700 border-violet-100",
        onClick: () => openQuickAdd("expense"),
        aria: "Tambah transaksi hari ini",
      })
    }

    return actions.slice(0, 2)
  }, [bills, budgets, allTransactions, budgetMonth, budgetYear, setActiveNav, openQuickAdd])

  const focusNote = useMemo(() => {
    return getFocusNote({
      budgets,
      bills,
      allTransactions,
      selectedMonth: budgetMonth,
      selectedYear: budgetYear,
      topCategory,
      topCategoryPct,
      monthlyDelta,
      statSavings,
      statIncome,
      statExpense,
       insights: visibleInsights,
    })
  }, [
    budgets,
    bills,
    allTransactions,
    budgetMonth,
    budgetYear,
    topCategory,
    topCategoryPct,
    monthlyDelta,
    statSavings,
    statIncome,
    statExpense,
    visibleInsights,
  ])

  const prioritizedInsights = useMemo(() => {
    if (!Array.isArray(visibleInsights)) return []

    return visibleInsights
      .filter(Boolean)
      .map((insight, index) => ({ insight, index }))
      .sort((a, b) => {
        const priorityA = INSIGHT_PRIORITY[a.insight.type] ?? 1
        const priorityB = INSIGHT_PRIORITY[b.insight.type] ?? 1
        return priorityA - priorityB || a.index - b.index
      })
      .slice(0, 2)
      .map(({ insight }) => insight)
  }, [visibleInsights])

  return (
    <div className="px-5 pt-4 animate-bento-in" key="home-tab">
      <div className="space-y-3">
        {data?.history?.limited && data?.history?.hasOlderData && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-earth-700" role="note">
            <p className="font-bold">Ringkasan terbatas</p>
            <p className="mt-1 text-xs leading-relaxed">
              Data yang tampil mencakup {data.history.months} bulan terakhir. Transaksi yang lebih lama tetap tersimpan di Google Sheets, tetapi tidak dihitung di ringkasan ini.
            </p>
          </div>
        )}
        <div className="bento-tile-dark mesh-hero text-white p-5 sm:p-6 relative overflow-hidden animate-bento-in stagger-1 min-h-[220px]" style={{ backgroundColor: THEME.heroBg }}>
          <div className="relative z-10 h-full flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Wallet size={12} className="opacity-70" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">Kekayaan Bersih</p>
              </div>
              <h2 className="text-[2.2rem] sm:text-5xl font-display font-bold tracking-tight animate-count-in leading-none break-words">
                {formatRpFull(animatedBalance)}
              </h2>
              <p className="text-[12px] sm:text-sm font-semibold text-white/80">
                {deltaLabel} {formatRp(Math.abs(monthlyDelta))} bulan ini
              </p>
            </div>
            <div className="rounded-2xl px-4 py-3 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.12)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1">{focusNote.label}</p>
              <p className="text-sm font-semibold text-white/90 leading-relaxed">
                {focusNote.message}
              </p>
            </div>
          </div>
        </div>

        <section className="bento-tile bg-white border border-earth-100 shadow-warm p-4 animate-bento-in stagger-2" aria-labelledby="home-cash-flow-title">
          <div className="flex items-start justify-between gap-3 mb-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-earth-500">{cashFlowPeriodLabel}</p>
              <h3 id="home-cash-flow-title" className="text-sm sm:text-base font-bold font-display text-earth-800">Arus Kas {cashFlowPeriodLabel}</h3>
            </div>
            <span className="rounded-full bg-earth-50 px-2.5 py-1 text-[10px] font-bold text-earth-500">Ringkas</span>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setDrillDown({ type: "income", title: "Pemasukan", transactions: scopedTransactions })}
              aria-label="Lihat 10 transaksi pemasukan terbesar"
              className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-left transition-colors hover:bg-earth-50 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-earth-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: THEME.incomeBg, color: THEME.income }}>
                  <ArrowDownRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </span>
                Pemasukan
              </span>
              <strong className="text-sm tabular-nums" style={{ color: THEME.income }}>{formatRp(cashFlowIncome)}</strong>
            </button>
            <button
              type="button"
              onClick={() => setDrillDown({ type: "expense", title: "Pengeluaran", transactions: scopedTransactions })}
              aria-label="Lihat 10 transaksi pengeluaran terbesar"
              className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-left transition-colors hover:bg-earth-50 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-earth-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: THEME.expenseBg, color: THEME.expense }}>
                  <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </span>
                Pengeluaran
              </span>
              <strong className="text-sm tabular-nums" style={{ color: THEME.expense }}>{formatRp(cashFlowExpense)}</strong>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNav("plan")
                openPlanSection?.("goal")
              }}
              aria-label="Lihat ringkasan tabungan dan goal"
              className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-left transition-colors hover:bg-earth-50 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-earth-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: THEME.savingsBg, color: THEME.savings }}>
                  <PiggyBank size={14} strokeWidth={2.4} aria-hidden="true" />
                </span>
                Tabungan
              </span>
              <strong className="text-sm tabular-nums" style={{ color: THEME.savings }}>{formatRp(cashFlowSavings)}</strong>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-earth-100 px-3 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Surplus/Defisit</p>
              <p className="mt-0.5 text-[11px] font-semibold text-earth-600">{cashFlowBalanceLabel}</p>
            </div>
            <p className="text-base font-bold tabular-nums" style={{ color: cashFlowBalance >= 0 ? THEME.income : THEME.danger }}>
              {cashFlowBalance > 0 ? "+" : cashFlowBalance < 0 ? "−" : ""}{formatRp(Math.abs(cashFlowBalance))}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveNav("stats")}
            aria-label="Lihat kategori pengeluaran terbesar di Statistik"
            className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-earth-100 bg-earth-50/60 px-3 text-left transition-colors hover:bg-earth-50 active:scale-[0.99]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: THEME.primaryBg, color: THEME.primary }}>
                <Sparkles size={14} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-earth-500">Kategori terbesar</span>
                <span className="block truncate text-xs font-bold text-earth-800">{topCategory?.name || "-"}</span>
              </span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold text-earth-500">
              {Number(topCategoryPct || 0).toFixed(0)}% <ArrowRight size={12} aria-hidden="true" />
            </span>
          </button>
        </section>

        <div className="bento-tile bg-white border border-earth-100 shadow-warm p-3 sm:p-4 animate-bento-in stagger-3">
          <div className="flex items-center justify-between gap-3 mb-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-earth-500">Beranda</p>
              <h3 className="text-sm sm:text-base font-bold font-display text-earth-800">Aksi Prioritas</h3>
            </div>
            <button
              onClick={() => setActiveNav("plan")}
              className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all"
              aria-label="Buka Rencana untuk lihat semua prioritas"
            >
              Buka Rencana <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>

          <div className={`grid gap-2 ${priorityActions.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            {priorityActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.key}
                  onClick={action.onClick}
                  aria-label={action.aria}
                  className="rounded-2xl border border-earth-100 p-3 text-left hover:-translate-y-0.5 transition-transform bg-earth-50/60"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${action.tint}`}>
                      <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-earth-500">{action.eyebrow}</p>
                      <p className="text-sm font-bold text-earth-800 leading-snug mt-1">{action.title}</p>
                      <p className="text-[11px] text-earth-500 leading-snug mt-1">{action.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Budget status (compact summary, hides if no budgets) */}
      {hasFeature(entitlement, "budgets") && <BudgetStatusCard
        allTransactions={allTransactions}
        setActiveNav={setActiveNav}
        openPlanSection={openPlanSection}
      />}

      {hasFeature(entitlement, "insights") && prioritizedInsights.length > 0 && (
        <section className="mt-6 animate-bento-in stagger-8" aria-labelledby="home-insights-title">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h3 id="home-insights-title" className="text-base font-bold font-display text-earth-800">Wawasan Utama</h3>
            <button
              type="button"
              onClick={() => setActiveNav("stats")}
              aria-label="Buka Statistik untuk lihat semua wawasan"
              className="flex min-h-11 items-center gap-1 text-[11px] font-bold text-violet-600 transition-all hover:gap-2"
            >
              Buka Statistik <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-2">
            {prioritizedInsights.map((insight, index) => <HomeInsightCard key={`${insight.text || "insight"}-${index}`} insight={insight} />)}
          </div>
        </section>
      )}

      {/* Financial Health Score follows the planning narrative and insights. */}
      {!isFeatureEnabled(entitlement, "healthScore") ? (
        <LockedFeaturePreview title="Health Score" description="Fitur sedang tidak tersedia." unavailable />
      ) : hasFeature(entitlement, "healthScore") ? (
        <HealthScoreCard transactions={data?.transactions} monthlyData={monthlyData} selectedMonth={selectedMonth} selectedYear={selectedYear} liquidSavingsCategories={liquidSavingsCategories} />
      ) : (
        <LockedFeaturePreview title="Health Score" description="Ringkasan kesehatan keuangan tersedia di Pro." />
      )}

      {/* Recent transactions */}
      <div className="mt-6 animate-bento-in stagger-10">
        <div className="flex justify-between items-end mb-3 px-1">
          <h3 className="text-base font-bold font-display text-earth-800">Transaksi Terbaru</h3>
          <button onClick={() => setActiveNav("stats")} aria-label="Lihat semua transaksi di Statistik" className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all">
            Lihat Semua <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
        {recent5.length === 0 ? (
          <EmptyState
            icon={<Wallet size={20} />}
            title="Belum ada transaksi"
            hint="Tambah transaksi pertama kamu untuk mulai melacak keuangan"
            action={
              <button onClick={() => openQuickAdd("expense")} className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop">
                Tambah Transaksi
              </button>
            }
          />
        ) : (
          <div className="bento-tile bg-white border border-earth-100 shadow-warm p-2">
            {recent5.map((t, i) => {
              const borderColor = t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.expense
              const special = isSpecialExpense(t)
              return (
                <div key={i} className={`flex items-center justify-between p-3 pl-4 rounded-2xl border-l-4 hover:bg-earth-50/60 transition-colors animate-fade-in-up stagger-${i + 1}`} style={{ borderLeftColor: borderColor }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: t.type === "income" ? THEME.incomeBg : t.type === "savings" ? THEME.savingsBg : THEME.expenseBg }}>
                      {t.type === "income" ? <ArrowDownRight size={16} color={THEME.income} aria-hidden="true" /> : t.type === "savings" ? <PiggyBank size={16} color={THEME.savings} aria-hidden="true" /> : <ArrowUpRight size={16} color={THEME.expense} aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold text-sm text-earth-800 truncate">{t.category}</p>
                        {special && <SpecialBadge />}
                      </div>
                      <p className="text-[11px] text-earth-500 mt-0.5 truncate">
                        {t.desc || "—"} · {t.date}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-sm flex-shrink-0 ml-2" style={{ color: t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.expense }}>
                    {t.type === "income" ? "+" : t.type === "savings" ? "" : "-"}{formatRp(t.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
