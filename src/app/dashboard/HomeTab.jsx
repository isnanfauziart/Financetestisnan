"use client"
import { useMemo } from "react"
import { Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Sparkles, ArrowRight, Clock3, AlertTriangle, PlusCircle } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRp, formatRpFull, useCountUpOvershoot, useCountUp } from "./_components/helpers"
import EmptyState from "./_components/EmptyState"
import BudgetStatusCard from "@/components/BudgetStatusCard"
import HealthScoreCard from "@/components/HealthScoreCard"
import { useBudgets, useBills } from "@/lib/useSharedData"
import { getFocusNote } from "./_components/focusNote"

export default function HomeTab({
  data,
  statIncome, statExpense, statSavings,
  topCategory, topCategoryPct,
  recent5,
  setActiveNav, openQuickAdd, setDrillDown,
  selectedMonth, selectedYear, monthlyData,
  allTransactions,
  insights,
}) {
  const animatedBalance = useCountUpOvershoot(data?.netWorth || 0)
  const animatedIncome = useCountUp(data?.totalIncome || 0)
  const animatedExpense = useCountUp(data?.totalExpense || 0)
  const animatedSavings = useCountUp(data?.totalSavings || 0)
  const monthlyDelta = data?.netWorthMonthlyDelta || 0
  const deltaLabel = monthlyDelta >= 0 ? "Bertumbuh" : "Turun"
  const budgetMonth = selectedMonth && selectedMonth !== "Semua Bulan"
    ? selectedMonth
    : AVAILABLE_MONTHS[new Date().getMonth()]
  const budgetYear = selectedYear && selectedYear !== "Semua Tahun"
    ? selectedYear
    : String(new Date().getFullYear())
  const { budgets } = useBudgets(budgetMonth, budgetYear)
  const { bills } = useBills()

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
        onClick: () => setActiveNav("plan"),
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
        description: `${urgentBudget.pct.toFixed(0)}% terpakai • Lihat detail kategori di Statistik.`,
        icon: AlertTriangle,
        tint: urgentBudget.pct >= 100 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-orange-50 text-orange-700 border-orange-100",
        onClick: () => setActiveNav("stats"),
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

  const summaryCards = [
    {
      key: "income",
      label: "Pemasukan",
      value: formatRp(animatedIncome),
      icon: ArrowDownRight,
      tint: THEME.incomeBg,
      color: THEME.income,
      onClick: () => setDrillDown({ type: "income", title: "Pemasukan" }),
      aria: "Lihat 10 transaksi pemasukan terbesar",
    },
    {
      key: "expense",
      label: "Pengeluaran",
      value: formatRp(animatedExpense),
      icon: ArrowUpRight,
      tint: THEME.expenseBg,
      color: THEME.expense,
      onClick: () => setDrillDown({ type: "expense", title: "Pengeluaran" }),
      aria: "Lihat 10 transaksi pengeluaran terbesar",
    },
    {
      key: "savings",
      label: "Tabungan",
      value: formatRp(animatedSavings),
      icon: PiggyBank,
      tint: THEME.savingsBg,
      color: THEME.savings,
      onClick: () => setActiveNav("plan"),
      aria: "Lihat ringkasan tabungan dan goal",
    },
    {
      key: "top",
      label: "Terbesar",
      value: topCategory.name,
      meta: `${topCategoryPct.toFixed(0)}% dari pengeluaran`,
      icon: Sparkles,
      tint: THEME.primaryBg,
      color: THEME.primary,
      onClick: () => setActiveNav("stats"),
      aria: "Lihat kategori pengeluaran terbesar di Statistik",
    },
  ]

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
      insights,
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
    insights,
  ])

  return (
    <div className="px-5 pt-4 animate-bento-in" key="home-tab">
      <div className="space-y-3">
        <div className="bento-tile-dark mesh-hero text-white p-5 sm:p-6 relative overflow-hidden animate-bento-in stagger-1 min-h-[220px]">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl animate-glow" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.4) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)" }} />
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

        <div className="bento-tile bg-white border border-earth-100 shadow-warm p-3 sm:p-4 animate-bento-in stagger-2">
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

        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon
            return (
              <button
                key={card.key}
                onClick={card.onClick}
                aria-label={card.aria}
                className={`bento-tile bg-white border border-earth-100 p-4 text-left shadow-warm animate-bento-in stagger-${idx + 3} active:scale-[0.98] transition-transform min-h-[126px]`}
              >
                <div className="h-full flex flex-col justify-between gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: card.tint, color: card.color }}>
                    <Icon size={16} strokeWidth={2.4} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">{card.label}</p>
                    <p className="text-base font-bold text-earth-800 leading-tight mt-1 break-words">{card.value}</p>
                    {card.meta && <p className="text-[11px] text-earth-500 mt-1 leading-snug">{card.meta}</p>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Financial Health Score (replaces spending gauge) */}
      <HealthScoreCard
        transactions={data?.transactions}
        monthlyData={monthlyData}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      {/* Budget status (compact summary, hides if no budgets) */}
      <BudgetStatusCard
        allTransactions={allTransactions}
        setActiveNav={setActiveNav}
      />

      {/* Recent transactions */}
      <div className="mt-6 animate-bento-in stagger-9">
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
              return (
                <div key={i} className={`flex items-center justify-between p-3 pl-4 rounded-2xl border-l-4 hover:bg-earth-50/60 transition-colors animate-fade-in-up stagger-${i + 1}`} style={{ borderLeftColor: borderColor }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: t.type === "income" ? THEME.incomeBg : t.type === "savings" ? THEME.savingsBg : THEME.expenseBg }}>
                      {t.type === "income" ? <ArrowDownRight size={16} color={THEME.income} aria-hidden="true" /> : t.type === "savings" ? <PiggyBank size={16} color={THEME.savings} aria-hidden="true" /> : <ArrowUpRight size={16} color={THEME.expense} aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-earth-800 truncate">{t.category}</p>
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
