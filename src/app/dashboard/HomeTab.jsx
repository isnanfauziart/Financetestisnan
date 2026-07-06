"use client"
import { Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Sparkles, Plus, ArrowRight } from "lucide-react"
import { THEME } from "./_components/constants"
import { formatRp, formatRpFull, useCountUpOvershoot, useCountUp } from "./_components/helpers"
import EmptyState from "./_components/EmptyState"
import BudgetStatusCard from "@/components/BudgetStatusCard"
import HealthScoreCard from "@/components/HealthScoreCard"

export default function HomeTab({
  data, session,
  statIncome, statExpense, statSavings,
  topCategory, topCategoryPct,
  recent5,
  setActiveNav, openQuickAdd, setDrillDown,
  onToast,
  selectedMonth, selectedYear, monthlyData,
  filteredTransactions, allTransactions,
  onCategoryClick,
}) {
  const animatedBalance = useCountUpOvershoot(data?.netWorth || 0)
  const animatedIncome = useCountUp(data?.totalIncome || 0)
  const animatedExpense = useCountUp(data?.totalExpense || 0)
  const animatedSavings = useCountUp(data?.totalSavings || 0)
  const monthlyDelta = data?.netWorthMonthlyDelta || 0
  const deltaLabel = monthlyDelta >= 0 ? "Bertumbuh" : "Turun"

  return (
    <div className="px-5 pt-4 animate-bento-in" key="home-tab">
      <div className="grid grid-cols-3 gap-3 auto-rows-[110px]">

        {/* Hero — Kekayaan Bersih (2 cols x 2 rows) */}
        <div className="col-span-2 row-span-2 bento-tile-dark mesh-hero text-white p-5 relative overflow-hidden animate-bento-in stagger-1">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl animate-glow" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.4) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)" }} />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wallet size={12} className="opacity-70" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">Kekayaan Bersih</p>
              </div>
              <h2 className="text-3xl font-display font-bold tracking-tight animate-count-in leading-none">
                {formatRpFull(animatedBalance)}
              </h2>
              <p className="mt-2 text-[11px] font-semibold text-white/80">
                {deltaLabel} {formatRp(Math.abs(monthlyDelta))} bulan ini
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => openQuickAdd("expense")}
                aria-label="Tambah transaksi baru"
                className="w-full rounded-2xl px-3 py-2.5 text-sm font-bold text-left backdrop-blur-md active:scale-[0.98] transition-transform"
                style={{ background: "rgba(255,255,255,0.14)" }}
              >
                Tambah Transaksi
              </button>
              <div className="grid grid-cols-3 gap-2">
              <div className="flex-1 rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Pemasukan</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <ArrowDownRight size={11} aria-hidden="true" /> {formatRp(animatedIncome)}
                </p>
              </div>
              <div className="flex-1 rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Pengeluaran</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <ArrowUpRight size={11} aria-hidden="true" /> {formatRp(animatedExpense)}
                </p>
              </div>
                <div className="flex-1 rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Tabungan</p>
                  <p className="text-sm font-bold flex items-center gap-1">
                    <PiggyBank size={11} aria-hidden="true" /> {formatRp(animatedSavings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Category — small */}
        <button
          onClick={() => setActiveNav("stats")}
          aria-label="Lihat kategori pengeluaran terbesar di Statistik"
          className="col-span-1 row-span-1 bento-tile mesh-violet text-white p-3.5 relative overflow-hidden text-left animate-bento-in stagger-2 active:scale-95 transition-transform"
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.3)" }} />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <Sparkles size={14} className="opacity-80" aria-hidden="true" />
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">Terbesar</p>
              <p className="text-[11px] font-bold leading-tight truncate">{topCategory.name}</p>
              <p className="text-[10px] font-semibold opacity-80 mt-0.5">{topCategoryPct.toFixed(0)}%</p>
            </div>
          </div>
        </button>

        {/* Quick add — small */}
        <button
          onClick={() => openQuickAdd("expense")}
          aria-label="Tambah pengeluaran cepat"
          className="col-span-1 row-span-1 bento-tile mesh-amber text-white p-3.5 relative overflow-hidden text-left animate-bento-in stagger-3 active:scale-95 transition-transform"
        >
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.3)" }} />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <Plus size={14} className="opacity-80" aria-hidden="true" />
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">Tambah</p>
              <p className="text-[11px] font-bold leading-tight">Cepat</p>
            </div>
          </div>
        </button>

        {/* Income tile */}
        <button onClick={() => setDrillDown({ type: "income", title: "Pemasukan" })} aria-label="Lihat 10 transaksi pemasukan terbesar" className="col-span-1 row-span-1 bento-tile bg-sage-50 border border-sage-100 p-3.5 text-left animate-bento-in stagger-4 active:scale-95 transition-transform">
          <div className="h-full flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.income + "22", color: THEME.income }}>
              <ArrowDownRight size={14} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-sage-700">Pemasukan</p>
              <p className="text-sm font-bold text-sage-700 leading-tight">{formatRp(animatedIncome)}</p>
            </div>
          </div>
        </button>

        {/* Expense tile */}
        <button onClick={() => setDrillDown({ type: "expense", title: "Pengeluaran" })} aria-label="Lihat 10 transaksi pengeluaran terbesar" className="col-span-1 row-span-1 bento-tile bg-clay-50 border border-clay-100 p-3.5 text-left animate-bento-in stagger-5 active:scale-95 transition-transform">
          <div className="h-full flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.expense + "22", color: THEME.expense }}>
              <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-clay-600">Pengeluaran</p>
              <p className="text-sm font-bold text-clay-600 leading-tight">{formatRp(animatedExpense)}</p>
            </div>
          </div>
        </button>

        {/* Savings tile (removed - duplicated Net Worth hero) */}
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
