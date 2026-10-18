"use client"
import { useMemo, useState } from "react"
import { Wallet, ArrowRight, Clock3, AlertTriangle, PlusCircle, Repeat, Target, Activity, SlidersHorizontal } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRp, formatRpFull, maskRupiah, useCountUpOvershoot, relativeDate, parseTxDate } from "./_components/helpers"
import EyeToggle from "./_components/EyeToggle"
import EmptyState from "./_components/EmptyState"
import HomeLayoutSheet from "./_components/HomeLayoutSheet"
import { getCategoryVisual } from "@/lib/categoryIcons"
import BudgetStatusCard from "@/components/BudgetStatusCard"
import DailyHealthGrid from "@/components/DailyHealthGrid"
import HealthScoreCard from "@/components/HealthScoreCard"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import { useBudgets, useBills, useSettings, useGoals } from "@/lib/useSharedData"
import { getFocusNote } from "./_components/focusNote"
import { hasFeature, isFeatureEnabled, getFeatureGate, isProRegistrationOpen } from "@/lib/featureAccess"
import { isSpecialExpense } from "@/lib/expenseClass"
import { isRepeatableTransaction } from "@/lib/transactionRepeat"
import BalanceDetailSheet from "@/components/BalanceDetailSheet"
import { getWibDateParts, daysInMonth } from "@/lib/wibCalendar"
import { buildChecklistActions } from "@/lib/homeChecklist"
import { detectAnomalies } from "@/lib/anomalies"
import InsightCard from "@/components/InsightCard"
import { BALANCE_COPY, buildRincianRows, formatBalanceBasis } from "./_components/balanceCopy"
import { useFinancialWriteGuard } from "@/lib/financialWriteState"
import { HOME_CARD_DEFS, loadHomeLayout, saveHomeLayout } from "@/lib/homeLayout"

function SpecialBadge() {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
      Spesial
    </span>
  )
}

const INSIGHT_PRIORITY = { warning: 0, danger: 0, info: 1, positive: 2 }

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
  moneyHidden = false,
  onToggleMoneyVisibility,
  sessionKey,
}) {
  const proRegistrationOpen = isProRegistrationOpen(entitlement)
  const guard = useFinancialWriteGuard()
  // Privacy-eye mode: every covered headline amount renders through `masked`,
  // which swaps digits for bullets while `moneyHidden` is on. One shared flag
  // drives every eye on the page, so tapping any eye toggles them all.
  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)
  const showEye = typeof onToggleMoneyVisibility === "function"
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
  const scopedTransactions = filteredTransactions ?? allTransactions ?? []
  const scopedPeriodLabel = selectedMonth && selectedYear && selectedMonth !== "Semua Bulan" && selectedYear !== "Semua Tahun"
    ? `${selectedMonth} ${selectedYear}`
    : "Periode yang dipilih"
  const deltaLabel = monthlyDelta >= 0 ? "Bertumbuh" : "Turun"
  const currentDate = getWibDateParts()
  // Items 4+11: "Bisa dipakai sekarang" is a deliberate sub-display under the
  // net-worth hero — 1.25rem semibold, never competing with the 2.2rem bold
  // headline — with a per-day runway line beneath it.
  const availableNow = Number(balances?.available?.value) || 0
  const heroDaysLeft = Math.max(1, daysInMonth(currentDate.year, currentDate.monthIndex) - currentDate.day + 1)
  const heroPerDay = Math.round(availableNow / heroDaysLeft)
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

  // Top 3 pengeluaran: the biggest actual expenses for the selected filter
  // period. Spesial expenses are included — the home list mirrors the actual
  // ledger, same as the recent-transactions rows and the hero cash row.
  const topExpenses = useMemo(() => (
    scopedTransactions
      .filter((tx) => tx.type === "expense")
      .slice()
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 3)
  ), [scopedTransactions])

  // Item 20 — Beranda edit mode: order + visibility, persisted per device.
  const [homeLayout, setHomeLayout] = useState(() => loadHomeLayout())
  const [layoutSheetOpen, setLayoutSheetOpen] = useState(false)
  const updateHomeLayout = (next) => {
    setHomeLayout(next)
    saveHomeLayout(next)
  }

  // Item 12 — Daily Financial Health grid sources (all existing data).
  const dailyHealth = useMemo(() => {
    const monthName = AVAILABLE_MONTHS[currentDate.monthIndex]
    const yearStr = String(currentDate.year)
    const dayStart = new Date(currentDate.year, currentDate.monthIndex, currentDate.day).getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    let spentToday = 0
    let savedMonth = 0
    for (const t of scopedTransactions) {
      const amt = Number(t.amount) || 0
      if (t.type === "expense") {
        const ts = parseTxDate(t.date)
        if (ts >= dayStart && ts < dayEnd) spentToday += amt
      }
      if (t.type === "savings" && t.month === monthName && String(t.year) === yearStr) savedMonth += amt
    }
    const dueBills = (bills || []).filter((b) => ["overdue", "due_today", "due_soon"].includes(b.status))
    return {
      spentToday,
      savedMonth,
      billsDueCount: dueBills.length,
      billsDueAmount: dueBills.reduce((s, b) => s + (Number(b.jumlah) || 0), 0),
    }
  }, [scopedTransactions, bills, currentDate])

  // Item 14 — coach CTA: keyword-routed to the most relevant surface.
  const coachAction = useMemo(() => {
    const top = prioritizedInsights[0]
    if (!top) return null
    const text = String(top.text || "").toLowerCase()
    if (/budget|anggaran|limit/.test(text)) return { label: "Cek anggaran", run: () => openPlanSection?.("budget") }
    if (/tabung|dana darurat|goal|target/.test(text)) return { label: "Lihat target", run: () => openPlanSection?.("goal") }
    if (/tagihan|bayar/.test(text)) return { label: "Cek tagihan", run: () => openPlanSection?.("tagihan") }
    return { label: "Buka Statistik", run: () => setActiveNav?.("stats") }
  }, [prioritizedInsights, openPlanSection, setActiveNav])

  // ---- Item 20: Beranda card registry. Each card is defined once below;
  // the return renders them in the user's saved order, skipping hidden ones.
  const historyBanner = data?.history?.limited && data?.history?.hasOlderData ? (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-md3-on-surface-variant" role="note">
      <p className="font-bold">Yang tampil {data.history.months} bulan terakhir</p>
      <p className="mt-1 text-xs leading-relaxed">
        Artami menampilkan {data.history.months} bulan terakhir di sini. Data lama tetap aman di Google Sheets.
      </p>
    </div>
  ) : null

  const heroCard = (
        <div className="mesh-hero text-white p-5 sm:p-6 relative overflow-hidden rounded-[28px] animate-bento-in stagger-1" data-testid="home-hero" style={{ backgroundColor: THEME.heroBg }}>
          <div className="relative z-10 flex flex-col gap-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Wallet size={12} className="opacity-70" aria-hidden="true" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">{BALANCE_COPY.netWorth}</p>
                </div>
                {showEye && <EyeToggle hidden={moneyHidden} onToggle={onToggleMoneyVisibility} tone="dark" />}
              </div>
              <h2 className="text-[2.2rem] sm:text-5xl font-display font-bold tracking-tight animate-count-in leading-none break-words tabular-nums">
                {masked(formatRpFull(animatedBalance))}
              </h2>
              <p className="text-[12px] sm:text-sm font-semibold text-white/80">
                {deltaLabel} {masked(formatRp(Math.abs(monthlyDelta)))} bulan ini
              </p>
              <div className="border-t border-white/15 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{BALANCE_COPY.availableNow}</p>
                  <p className="mt-1 text-[1.25rem] font-display font-semibold tabular-nums leading-none">{masked(formatRpFull(availableNow))}</p>
                  <p className="mt-1 text-xs font-medium text-white/60">≈ {masked(`${formatRpFull(heroPerDay)}/hari`)} · {heroDaysLeft} hari tersisa</p>
                </div>
                <p className="mt-0.5 text-[10px] font-semibold text-white/70">{formatBalanceBasis(balances?.currentCash?.provisional)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {heldInSavings > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNav("plan")
                        openPlanSection?.("goal")
                      }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white/15 px-2.5 text-[10px] font-bold text-white/90 transition-colors hover:bg-white/25"
                      aria-label="Atur tabungan yang disisihkan di Rencana"
                    >
                      {masked(formatRpFull(heldInSavings))} {BALANCE_COPY.heldInSavings.toLowerCase()} <ArrowRight size={10} aria-hidden="true" />
                    </button>
                  )}
                  {rincianRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRincianOpen(true)}
                      aria-label="Buka rincian saldo"
                      className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white/15 px-2.5 text-[10px] font-bold text-white/90 transition-colors hover:bg-white/25"
                    >
                      Rincian saldo <ArrowRight size={10} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* Flat current-month cash row — hairline dividers, no nested boxes. */}
            <div className="border-t border-white/15 pt-4" data-testid="hero-cash-row">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-2">
                Arus kas bulan ini · {AVAILABLE_MONTHS[currentDate.monthIndex]} {currentDate.year}
              </p>
              <div className="grid grid-cols-3">
                <div className="min-w-0 pr-3">
                  <p className="text-[10px] font-semibold text-white/70">Uang masuk</p>
                  <p className="mt-0.5 text-[11px] sm:text-sm font-bold tabular-nums">{masked(formatRp(heroCashIn))}</p>
                </div>
                <div className="min-w-0 border-l border-white/15 px-3">
                  <p className="text-[10px] font-semibold text-white/70">Uang keluar</p>
                  <p className="mt-0.5 text-[11px] sm:text-sm font-bold tabular-nums">{masked(formatRp(heroCashOut))}</p>
                </div>
                <div className="min-w-0 border-l border-white/15 pl-3">
                  <p className="text-[10px] font-semibold text-white/70">Arus kas bersih</p>
                  <p className="mt-0.5 text-[11px] sm:text-sm font-bold tabular-nums">
                    {masked(`${heroCashNet > 0 ? "+" : heroCashNet < 0 ? "−" : ""}${formatRp(Math.abs(heroCashNet))}`)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
  )

  // Item 14 — the top insight, elevated into a dark coach card (max one).
  const coachCard = prioritizedInsights.length > 0 && coachAction ? (
    <div className="animate-bento-in stagger-2">
      <InsightCard
        insight={prioritizedInsights[0]}
        variant="coach"
        actionLabel={coachAction.label}
        onAction={coachAction.run}
      />
    </div>
  ) : null

  // Item 12 — Daily Financial Health 2×2 grid.
  const healthGridCard = (
    <div className="animate-bento-in stagger-2">
      <DailyHealthGrid
        spentToday={dailyHealth.spentToday}
        monthLeft={availableNow}
        billsDueCount={dailyHealth.billsDueCount}
        billsDueAmount={dailyHealth.billsDueAmount}
        savedMonth={dailyHealth.savedMonth}
        moneyHidden={moneyHidden}
        onOpenStats={() => setActiveNav("stats")}
        onOpenPlan={(section) => {
          if (section === "overview") setActiveNav("plan")
          else openPlanSection?.(section)
        }}
      />
    </div>
  )

  // Flat checklist — hairline rows, no nested cards.
  const checklistCard = (
        <section className="animate-bento-in stagger-2" data-testid="home-checklist" aria-labelledby="home-checklist-title">
          <div className="flex items-center justify-between gap-3 mb-1 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant">Beranda</p>
              <h3 id="home-checklist-title" className="text-sm sm:text-base font-bold font-display text-md3-on-surface">Yang perlu kamu cek</h3>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setLayoutSheetOpen(true)}
                aria-label="Atur tampilan Beranda"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-md3-on-surface-variant transition-colors hover:bg-md3-surface-container-low"
              >
                <SlidersHorizontal size={15} aria-hidden="true" />
              </button>
              <button
                onClick={() => setActiveNav("plan")}
                className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all"
                aria-label="Buka Rencana untuk lihat semua prioritas"
              >
                Buka Rencana <ArrowRight size={12} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {priorityActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.key}
                  onClick={action.onClick}
                  aria-label={action.aria}
                  className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-[var(--surface)]"
                >
                  <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${action.tint}`}>
                    <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-md3-on-surface-variant">{action.eyebrow}</p>
                    <p className="text-sm font-bold text-md3-on-surface leading-snug mt-0.5">{action.title}</p>
                    <p className="text-[11px] text-md3-on-surface-variant leading-snug mt-0.5">{action.description}</p>
                  </div>
                  <ArrowRight size={14} className="flex-shrink-0 text-md3-on-surface-variant" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </section>
  )

  // Top 3 pengeluaran for the selected filter period. Rows open the
  // existing Top-10 expense drill-down scoped to the same period.
  const topExpensesCard = (
        <section className="animate-bento-in stagger-2" aria-labelledby="home-top-expenses-title" data-testid="home-top-expenses">
          <div className="flex items-start justify-between gap-3 mb-3 px-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant">{scopedPeriodLabel}</p>
                <h3 id="home-top-expenses-title" className="text-sm sm:text-base font-bold font-display text-md3-on-surface">Top 3 pengeluaran</h3>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="rounded-full bg-md3-surface px-2.5 py-1 text-[10px] font-bold text-md3-on-surface-variant">Terbesar</span>
                {showEye && <EyeToggle hidden={moneyHidden} onToggle={onToggleMoneyVisibility} />}
              </div>
            </div>

          {topExpenses.length === 0 ? (
            <EmptyState
              icon={<Wallet size={20} aria-hidden="true" />}
              title="Belum ada pengeluaran"
              hint="Catat pengeluaran pertamamu supaya Top 3 bisa terisi."
              action={
                <button
                  type="button"
                  onClick={() => openQuickAdd("expense")}
                  className="min-h-11 px-4 py-2 rounded-full text-xs font-bold text-white shadow-pop"
                  style={{ backgroundColor: THEME.primary }}
                >
                  Catat pengeluaran
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {topExpenses.map((tx, index) => {
                const special = isSpecialExpense(tx)
                const { icon: CategoryIcon } = getCategoryVisual(tx.category)
                return (
                  <button
                    key={`${tx.date || "tx"}-${tx.category}-${index}`}
                    type="button"
                    onClick={() => setDrillDown({ type: "expense", title: "Pengeluaran", transactions: scopedTransactions })}
                    aria-label={`Lihat rincian pengeluaran ${tx.category}`}
                    className="flex min-h-11 w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-[var(--surface)]"
                  >
                    <span aria-hidden="true" className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-md3-surface-container-high text-xs font-bold tabular-nums text-md3-on-surface-variant">
                      {index + 1}
                    </span>
                    <span aria-hidden="true" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-md3-secondary-container">
                      <CategoryIcon size={15} strokeWidth={2.1} className="text-md3-on-secondary-container" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-sm font-medium text-md3-on-surface">{tx.category}</span>
                        {special && <SpecialBadge />}
                      </span>
                      <span className="block truncate text-[11px] text-md3-on-surface-variant mt-0.5">
                        {relativeDate(tx.date)}{tx.desc ? ` · ${tx.desc}` : ""}
                      </span>
                    </span>
                    <strong className="flex-shrink-0 text-sm font-bold tabular-nums" style={{ color: THEME.expense }}>
                      {masked(formatRp(tx.amount))}
                    </strong>
                  </button>
                )
              })}
            </div>
          )}
        </section>
  )

  // Wave 6: the generic focus note moved out of the hero — it must not
  // compete with the financial headline or the check actions.
  const focusNoteCard = (
        <div className="animate-bento-in stagger-3 border-l-2 border-[var(--income)] pl-4" data-testid="home-focus-note">
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant mb-1">{focusNote.label}</p>
          <p className="text-sm font-semibold leading-relaxed text-md3-on-surface">{focusNote.message}</p>
        </div>
  )

  // Budget status (compact summary, hides if no budgets)
  const budgetsCard = hasFeature(entitlement, "budgets") ? (
      <BudgetStatusCard
        allTransactions={allTransactions}
        setActiveNav={setActiveNav}
        openPlanSection={openPlanSection}
      />
  ) : null

  // Item 14: the top insight already renders as the dark coach card above;
  // the section below keeps the remaining quiet insights.
  const quietInsights = prioritizedInsights.slice(1)
  const insightsCard = hasFeature(entitlement, "insights") && quietInsights.length > 0 ? (
        <section className="animate-bento-in stagger-8" aria-labelledby="home-insights-title">
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
            {quietInsights.map((insight, index) => <InsightCard key={`${insight.text || "insight"}-${index}`} insight={insight} variant="neutral" />)}
          </div>
        </section>
  ) : null

  // Financial Health Score follows the planning narrative and insights.
  const healthScoreCard = (
    <>
      {getFeatureGate(entitlement, "healthScore") === "unavailable" ? (
        <LockedFeaturePreview title="Health Score" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} />
      ) : getFeatureGate(entitlement, "healthScore") === "unresolved" ? (
        <LockedFeaturePreview title="Health Score" unresolved />
      ) : hasFeature(entitlement, "healthScore") ? (
        <HealthScoreCard transactions={data?.transactions} monthlyData={monthlyData} selectedMonth={selectedMonth} selectedYear={selectedYear} liquidSavingsCategories={liquidSavingsCategories} onOpenPlanBudgets={openPlanSection} />
      ) : (
        <LockedFeaturePreview title="Health Score" description="Ringkasan kesehatan keuangan tersedia di Pro." example="Contoh: skor 78 (B) dari lima faktor — rasio tabungan, dana darurat, kepatuhan budget, tren pengeluaran, dan stabilitas pemasukan." proRegistrationOpen={proRegistrationOpen} />
      )}
    </>
  )

  // Recent transactions
  const recentCard = (
      <div className="animate-bento-in stagger-10">
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
          <div>
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
  )

  // ---- Item 20: render cards in the user's saved order, skipping hidden
  // and empty ones. Default order keeps the tested narrative intact.
  const cardElements = {
    hero: heroCard,
    coach: coachCard,
    healthGrid: healthGridCard,
    checklist: checklistCard,
    topExpenses: topExpensesCard,
    focusNote: focusNoteCard,
    budgets: budgetsCard,
    insights: insightsCard,
    healthScore: healthScoreCard,
    recent: recentCard,
  }
  const visibleOrder = homeLayout.order.filter(
    (key) => !homeLayout.hidden.includes(key) && cardElements[key]
  )

  return (
    <div className="px-5 pt-4 animate-bento-in" key="home-tab">
      {historyBanner}
      <div className="space-y-7">
        {visibleOrder.map((key) => (
          <div key={key}>{cardElements[key]}</div>
        ))}
      </div>
      <HomeLayoutSheet
        open={layoutSheetOpen}
        onClose={() => setLayoutSheetOpen(false)}
        layout={homeLayout}
        onChange={updateHomeLayout}
      />
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
