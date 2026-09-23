"use client"
import { useMemo, useState } from "react"
import { Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Sparkles, ArrowRight, Clock3, AlertTriangle, PlusCircle, Repeat, Target, Activity } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRp, formatRpFull, useCountUpOvershoot, relativeDate } from "./_components/helpers"
import EmptyState from "./_components/EmptyState"
import { getCategoryVisual } from "@/lib/categoryIcons"
import BudgetStatusCard from "@/components/BudgetStatusCard"
import HealthScoreCard from "@/components/HealthScoreCard"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import { useBudgets, useBills, useSettings, useGoals } from "@/lib/useSharedData"
import { getFocusNote } from "./_components/focusNote"
import { hasFeature, isFeatureEnabled, isProRegistrationOpen } from "@/lib/featureAccess"
import { isSpecialExpense } from "@/lib/expenseClass"
import { isRepeatableTransaction } from "@/lib/transactionRepeat"
import BalanceDetailSheet from "@/components/BalanceDetailSheet"
import { getWibDateParts } from "@/lib/wibCalendar"
import { buildChecklistActions } from "@/lib/homeChecklist"
import { detectAnomalies } from "@/lib/anomalies"
import { BALANCE_COPY, buildRincianRows, formatBalanceBasis } from "./_components/balanceCopy"
import { useFinancialWriteGuard } from "@/lib/financialWriteState"

function SpecialBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
      Spesial
    </span>
  )
}

const INSIGHT_PRIORITY = { warning: 0, danger: 0, info: 1, positive: 2 }

function HomeInsightCard({ insight }) {
  const Icon = insight.icon || Sparkles
  const color = insight.color || THEME.smart

  return (
    <article className="rounded-2xl border border-md3-outline-variant bg-md3-surface-container-low p-3 shadow-warm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-md3-surface-container-lowest" style={{ color }}>
          <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-md3-on-surface">{insight.text}</p>
      </div>
    </article>
  )
}

export default function HomeTab({
  data,
  statIncome, statExpense, statSavings,
  topCategory, topCategoryPct,
  recent5,
  setActiveNav, openPlanSection, openQuickAdd, openStatsDestination, setDrillDown, onRepeat,
  selectedMonth, selectedYear, monthlyData,
  allTransactions, filteredTransactions,
  insights,
  entitlement,
  sessionKey,
}) {
  const proRegistrationOpen = isProRegistrationOpen(entitlement)
  const guard = useFinancialWriteGuard()
  const [rincianOpen, setRincianOpen] = useState(false)
  const balances = data?.balances
  const rincianRows = buildRincianRows(balances)
  const rincian = balances?.rincian || {}
  // The money the hero subtracts: goal reservations plus everything still
  // unassigned or awaiting review. Surfaced so "Bisa dipakai sekarang"
  // reconciles with "Tersedia untuk dibagi" on the Rencana tab.
  const heldInSavings = Math.max(0, (Number(rincian.goalReservations) || 0) + (Number(rincian.unassignedSavings) || 0) + (Number(rincian.investmentReserved) || 0))
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
  const currentDate = getWibDateParts()
  // Wave 6 hero layer 3: the current WIB month from the actual (inclusive)
  // monthly series — never the routine analytics basis or the stats filters.
  const heroMonthRow = (data?.monthlyData || []).find(
    (row) => row.month === AVAILABLE_MONTHS[currentDate.monthIndex] && String(row.year) === String(currentDate.year),
  )
  const heroCashIn = Number(heroMonthRow?.pemasukan) || 0
  const heroCashOut = Number(heroMonthRow?.pengeluaran) || 0
  const heroCashNet = heroCashIn - heroCashOut
  const budgetMonth = selectedMonth && selectedMonth !== "Semua Bulan"
    ? selectedMonth
    : AVAILABLE_MONTHS[currentDate.monthIndex]
  const budgetYear = selectedYear && selectedYear !== "Semua Tahun"
    ? selectedYear
    : String(currentDate.year)
  const { budgets } = useBudgets(budgetMonth, budgetYear)
  const { bills } = useBills(true, sessionKey)
  const { settings } = useSettings(sessionKey)
  const { goals } = useGoals(sessionKey)
  const visibleInsights = hasFeature(entitlement, "insights") ? insights : []
  const configuredSavings = settings?.categories?.savings
  const liquidSavingsCategories = Array.isArray(configuredSavings)
    ? configuredSavings.filter(item => (item.savingsKind || item.kind) === "liquid" && item.active !== false).map(item => typeof item === "string" ? item : item.name)
    : undefined

  // Wave 6 — one deterministic builder owns the check surface (see
  // src/lib/homeChecklist.js for the approved priority order and cap). This
  // layer only supplies sources, icons/tints, and the navigation dispatch.
  const anomalies = useMemo(
    () => detectAnomalies({ transactions: allTransactions || [], month: budgetMonth, year: budgetYear }),
    [allTransactions, budgetMonth, budgetYear],
  )
  const anomalyEnabled = hasFeature(entitlement, "anomalyAlerts") && isFeatureEnabled(entitlement, "anomalyAlerts")

  const priorityActions = useMemo(() => {
    const items = buildChecklistActions({
      bills,
      budgets,
      allTransactions,
      month: budgetMonth,
      year: budgetYear,
      goals,
      allocations: data?.balances?.allocations,
      anomalies,
      anomalyEnabled,
    })

    const styleFor = (item) => {
      switch (item.kind) {
        case "bill":
          return { icon: Clock3, tint: "bg-rose-50 text-rose-600 border-rose-100" }
        case "budget":
          return item.eyebrow === "Budget jebol"
            ? { icon: AlertTriangle, tint: "bg-amber-50 text-amber-700 border-amber-100" }
            : { icon: AlertTriangle, tint: "bg-orange-50 text-orange-700 border-orange-100" }
        case "goal":
          return { icon: Target, tint: "bg-teal-50 text-teal-700 border-teal-100" }
        case "anomaly":
          return { icon: Activity, tint: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100" }
        default:
          return { icon: PlusCircle, tint: "bg-violet-50 text-violet-700 border-violet-100" }
      }
    }

    return items.map((item) => ({
      ...item,
      ...styleFor(item),
      onClick: () => {
        const destination = item.destination || {}
        if (destination.action === "quickAdd") return openQuickAdd(destination.txType || "expense")
        if (destination.tab === "stats") return openStatsDestination?.(destination)
        if (destination.tab === "plan") return openPlanSection?.(destination.section)
        return undefined
      },
    }))
  }, [bills, budgets, allTransactions, budgetMonth, budgetYear, goals, data, anomalies,
    anomalyEnabled, openPlanSection, openQuickAdd, openStatsDestination])

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
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-md3-on-surface-variant" role="note">
            <p className="font-bold">Yang tampil {data.history.months} bulan terakhir</p>
            <p className="mt-1 text-xs leading-relaxed">
              Artami menampilkan {data.history.months} bulan terakhir di sini. Data lama tetap aman di Google Sheets.
            </p>
          </div>
        )}
        <div className="bento-tile-dark mesh-hero text-white p-5 sm:p-6 relative overflow-hidden animate-bento-in stagger-1 min-h-[220px]" data-testid="home-hero" style={{ backgroundColor: THEME.heroBg }}>
          <div className="relative z-10 h-full flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <Wallet size={12} className="opacity-70" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{BALANCE_COPY.netWorth}</p>
              </div>
              <h2 className="text-[2.2rem] sm:text-5xl font-display font-bold tracking-tight animate-count-in leading-none break-words tabular-nums">
                {formatRpFull(animatedBalance)}
              </h2>
              <p className="text-[12px] sm:text-sm font-semibold text-white/80">
                {deltaLabel} {formatRp(Math.abs(monthlyDelta))} bulan ini
              </p>
              <div className="rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.12)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{BALANCE_COPY.availableNow}</p>
                <p className="mt-0.5 text-lg font-display font-bold tabular-nums">{formatRpFull(balances?.available?.value || 0)}</p>
                <p className="text-[10px] font-semibold text-white/70">{formatBalanceBasis(balances?.currentCash?.provisional)}</p>
                {heldInSavings > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav("plan")
                      openPlanSection?.("goal")
                    }}
                    className="mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-full bg-white/15 px-2.5 text-[10px] font-bold text-white/90 transition-colors hover:bg-white/25"
                    aria-label="Atur tabungan yang disisihkan di Rencana"
                  >
                    {formatRpFull(heldInSavings)} {BALANCE_COPY.heldInSavings.toLowerCase()} <ArrowRight size={10} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            {/* Layer 3: compact current-month cash row — always in the hero. */}
            <div className="rounded-2xl px-4 py-3 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.12)" }} data-testid="hero-cash-row">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
                Arus kas bulan ini · {AVAILABLE_MONTHS[currentDate.monthIndex]} {currentDate.year}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-white/70">Uang masuk</p>
                  <p className="text-[11px] sm:text-sm font-bold tabular-nums">{formatRp(heroCashIn)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-white/70">Uang keluar</p>
                  <p className="text-[11px] sm:text-sm font-bold tabular-nums">{formatRp(heroCashOut)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-white/70">Arus kas bersih</p>
                  <p className="text-[11px] sm:text-sm font-bold tabular-nums">
                    {heroCashNet > 0 ? "+" : heroCashNet < 0 ? "−" : ""}{formatRp(Math.abs(heroCashNet))}
                  </p>
                </div>
              </div>
            </div>
            {rincianRows.length > 0 && (
              <button
                type="button"
                onClick={() => setRincianOpen(true)}
                aria-label="Buka rincian saldo"
                className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full bg-white/15 px-3 py-2 text-[11px] font-bold text-white/90 transition-colors hover:bg-white/25"
              >
                Rincian saldo <ArrowRight size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Wave 6: Yang perlu kamu cek sits directly below the hero. */}
        <div className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant shadow-warm p-3 sm:p-4 animate-bento-in stagger-2" data-testid="home-checklist">
          <div className="flex items-center justify-between gap-3 mb-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant">Beranda</p>
              <h3 className="text-sm sm:text-base font-bold font-display text-md3-on-surface">Yang perlu kamu cek</h3>
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
                  className="rounded-2xl border border-md3-outline-variant p-3 text-left hover:-translate-y-0.5 transition-transform bg-md3-surface-container-low"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${action.tint}`}>
                      <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-md3-on-surface-variant">{action.eyebrow}</p>
                      <p className="text-sm font-bold text-md3-on-surface leading-snug mt-1">{action.title}</p>
                      <p className="text-[11px] text-md3-on-surface-variant leading-snug mt-1">{action.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <section className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant shadow-warm p-4 animate-bento-in stagger-2" aria-labelledby="home-cash-flow-title">
          <div className="flex items-start justify-between gap-3 mb-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant">{cashFlowPeriodLabel}</p>
              <h3 id="home-cash-flow-title" className="text-sm sm:text-base font-bold font-display text-md3-on-surface">Uang masuk &amp; Uang keluar {cashFlowPeriodLabel}</h3>
            </div>
            <span className="rounded-full bg-md3-surface px-2.5 py-1 text-[10px] font-bold text-md3-on-surface-variant">Ringkasan</span>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setDrillDown({ type: "income", title: "Pemasukan", transactions: scopedTransactions })}
              aria-label="Lihat 10 transaksi pemasukan terbesar"
              className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-left transition-colors hover:bg-md3-surface active:scale-[0.99]"
            >                <span className="flex items-center gap-2 text-xs font-semibold text-md3-on-surface-variant">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: THEME.incomeBg, color: THEME.income }}>
                  <ArrowDownRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </span>
                Uang masuk
              </span>
              <strong className="text-sm tabular-nums" style={{ color: THEME.income }}>{formatRp(cashFlowIncome)}</strong>
            </button>
            <button
              type="button"
              onClick={() => setDrillDown({ type: "expense", title: "Pengeluaran", transactions: scopedTransactions })}
              aria-label="Lihat 10 transaksi pengeluaran terbesar"
              className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-left transition-colors hover:bg-md3-surface active:scale-[0.99]"
            >                <span className="flex items-center gap-2 text-xs font-semibold text-md3-on-surface-variant">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: THEME.expenseBg, color: THEME.expense }}>
                  <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden="true" />
                </span>
                Uang keluar
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
              className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 text-left transition-colors hover:bg-md3-surface active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-md3-on-surface-variant">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: THEME.savingsBg, color: THEME.savings }}>
                  <PiggyBank size={14} strokeWidth={2.4} aria-hidden="true" />
                </span>
                Tabungan
              </span>
              <strong className="text-sm tabular-nums" style={{ color: THEME.savings }}>{formatRp(cashFlowSavings)}</strong>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-md3-outline-variant px-3 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Arus kas bersih</p>
              <p className="mt-0.5 text-[11px] font-semibold text-md3-on-surface-variant">{cashFlowBalanceLabel}</p>
            </div>
            <p className="text-base font-bold tabular-nums" style={{ color: cashFlowBalance >= 0 ? THEME.income : THEME.danger }}>
              {cashFlowBalance > 0 ? "+" : cashFlowBalance < 0 ? "−" : ""}{formatRp(Math.abs(cashFlowBalance))}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveNav("stats")}
            aria-label="Lihat kategori pengeluaran terbesar di Statistik"
            className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-md3-outline-variant bg-md3-surface px-3 text-left transition-colors hover:bg-md3-surface-container-high active:scale-[0.99]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: THEME.primaryBg, color: THEME.primary }}>
                <Sparkles size={14} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Kategori terbesar</span>
                <span className="block truncate text-xs font-bold text-md3-on-surface">{topCategory?.name || "-"}</span>
              </span>
            </span>
            <span className="flex flex-shrink-0 items-center gap-1 text-[11px] font-bold text-md3-on-surface-variant">
              {Number(topCategoryPct || 0).toFixed(0)}% <ArrowRight size={12} aria-hidden="true" />
            </span>
          </button>
        </section>

        {/* Wave 6: the generic focus note moved out of the hero — it must not
            compete with the financial headline or the check actions. */}
        <div className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant shadow-warm p-3 sm:p-4 animate-bento-in stagger-3" data-testid="home-focus-note">
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant mb-1">{focusNote.label}</p>
          <p className="text-sm font-semibold leading-relaxed text-md3-on-surface">{focusNote.message}</p>
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
            <h3 id="home-insights-title" className="text-base font-bold font-display text-md3-on-surface">Insights utama</h3>
            <button
              type="button"
              onClick={() => setActiveNav("stats")}
              aria-label="Buka Statistik untuk lihat semua insights"
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
        <LockedFeaturePreview title="Health Score" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} />
      ) : hasFeature(entitlement, "healthScore") ? (
        <HealthScoreCard transactions={data?.transactions} monthlyData={monthlyData} selectedMonth={selectedMonth} selectedYear={selectedYear} liquidSavingsCategories={liquidSavingsCategories} />
      ) : (
        <LockedFeaturePreview title="Health Score" description="Ringkasan kesehatan keuangan tersedia di Pro." proRegistrationOpen={proRegistrationOpen} />
      )}

      {/* Recent transactions */}
      <div className="mt-6 animate-bento-in stagger-10">
        <div className="flex justify-between items-end mb-3 px-1">
          <h3 className="text-base font-bold font-display text-md3-on-surface">Transaksi Terbaru</h3>
          <button onClick={() => setActiveNav("stats")} aria-label="Lihat semua transaksi di Statistik" className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all">
            Lihat semua <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
        {recent5.length === 0 ? (
          <EmptyState
            icon={<Wallet size={20} />}
            title="Belum ada transaksi"
            hint="Catat transaksi pertamamu supaya Artami bisa mulai membaca keuanganmu."
            action={
              <button onClick={() => openQuickAdd("expense")} className="text-xs font-bold px-4 py-2 rounded-full text-white mesh-violet shadow-pop">
                Catat transaksi
              </button>
            }
          />
        ) : (
          <div className="bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant shadow-warm p-2">
            {recent5.map((t, i) => {
              const amountColor = t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.expense
              const special = isSpecialExpense(t)
              const { icon: CategoryIcon } = getCategoryVisual(t.category)
              return (
                <div key={i}>
                  {i > 0 && <div aria-hidden="true" className="border-t border-md3-outline-variant ml-12" />}
                  {/* MD3 two-line list row: category avatar · name + relative date · right-aligned tabular-nums amount */}
                  <div className="flex items-center gap-3 px-3 py-3 hover:bg-md3-surface-container-high transition-colors">
                    <div aria-hidden="true" className="w-9 h-9 rounded-full bg-md3-secondary-container flex items-center justify-center flex-shrink-0">
                      <CategoryIcon size={15} strokeWidth={2.1} className="text-md3-on-secondary-container" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium text-md3-on-surface truncate">{t.category}</p>
                        {special && <SpecialBadge />}
                      </div>
                      <p className="text-[11px] text-md3-on-surface-variant mt-0.5 truncate">
                        {relativeDate(t.date)}{t.desc ? ` · ${t.desc}` : ""}
                      </p>
                    </div>
                    <p className="font-bold text-sm flex-shrink-0 ml-2 tabular-nums" style={{ color: amountColor }}>
                      {t.type === "income" ? "+" : t.type === "savings" ? "" : "-"}{formatRp(t.amount)}
                    </p>
                    {onRepeat && isRepeatableTransaction(t) && (
                      <button
                        type="button"
                        onClick={() => onRepeat(t)}
                        aria-label={`Ulangi transaksi ${t.category}`}
                        className="w-9 h-9 rounded-xl bg-md3-surface hover:bg-md3-surface-container-high flex items-center justify-center flex-shrink-0 text-md3-on-surface-variant hover:text-violet-600 transition-colors"
                      >
                        <Repeat size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BalanceDetailSheet
        open={rincianOpen}
        onClose={() => setRincianOpen(false)}
        rows={rincianRows}
        estimate={Boolean(balances?.rincian?.estimate)}
        guardBlocked={guard.blocked}
        guardMessage={guard.message}
      />
    </div>
  )
}
