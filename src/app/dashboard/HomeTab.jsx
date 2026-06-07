"use client"
import { useState } from "react"
import { Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Sparkles, Plus, Lightbulb, ArrowRight, AlertCircle, Info, TrendingUp } from "lucide-react"
import { THEME } from "./_components/constants"
import { formatRp, formatRpFull, useCountUpOvershoot, useCountUp } from "./_components/helpers"
import EmptyState from "./_components/EmptyState"

export default function HomeTab({
  data, session,
  statIncome, statExpense, statSavings,
  topCategory, topCategoryPct,
  insights,
  expenseRatio, gaugeAngle, gaugeColor,
  recent5,
  setActiveNav, openQuickAdd, setDrillDown,
}) {
  const animatedBalance = useCountUpOvershoot(data?.totalSurplus || 0)
  const animatedIncome = useCountUp(data?.totalIncome || 0)
  const animatedExpense = useCountUp(data?.totalExpense || 0)
  const animatedSavings = useCountUp(data?.totalSavings || 0)

  return (
    <div className="px-5 pt-4 animate-bento-in" key="home-tab">
      <div className="grid grid-cols-3 gap-3 auto-rows-[110px]">

        {/* Hero — Total Balance (2 cols x 2 rows) */}
        <div className="col-span-2 row-span-2 bento-tile-dark mesh-hero text-white p-5 relative overflow-hidden animate-bento-in stagger-1">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl animate-glow" style={{ background: "radial-gradient(circle, rgba(159,135,239,0.4) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)" }} />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wallet size={12} className="opacity-70" aria-hidden="true" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">Total Balance</p>
              </div>
              <h2 className="text-3xl font-display font-bold tracking-tight animate-count-in leading-none">
                {formatRpFull(animatedBalance)}
              </h2>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Income</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <ArrowDownRight size={11} aria-hidden="true" /> {formatRp(animatedIncome)}
                </p>
              </div>
              <div className="flex-1 rounded-2xl px-3 py-2 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.1)" }}>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-0.5">Expense</p>
                <p className="text-sm font-bold flex items-center gap-1">
                  <ArrowUpRight size={11} aria-hidden="true" /> {formatRp(animatedExpense)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Category — small */}
        <button
          onClick={() => setActiveNav("stats")}
          aria-label="View top spending category in Statistics"
          className="col-span-1 row-span-1 bento-tile mesh-violet text-white p-3.5 relative overflow-hidden text-left animate-bento-in stagger-2 active:scale-95 transition-transform"
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.3)" }} />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <Sparkles size={14} className="opacity-80" aria-hidden="true" />
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">Top</p>
              <p className="text-[11px] font-bold leading-tight truncate">{topCategory.name}</p>
              <p className="text-[10px] font-semibold opacity-80 mt-0.5">{topCategoryPct.toFixed(0)}%</p>
            </div>
          </div>
        </button>

        {/* Quick add — small */}
        <button
          onClick={() => openQuickAdd("expense")}
          aria-label="Quick add expense"
          className="col-span-1 row-span-1 bento-tile mesh-amber text-white p-3.5 relative overflow-hidden text-left animate-bento-in stagger-3 active:scale-95 transition-transform"
        >
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl" style={{ background: "rgba(255,255,255,0.3)" }} />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <Plus size={14} className="opacity-80" aria-hidden="true" />
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">Quick</p>
              <p className="text-[11px] font-bold leading-tight">Add</p>
            </div>
          </div>
        </button>

        {/* Income tile */}
        <button onClick={() => setDrillDown({ type: "income", title: "Pemasukan" })} aria-label="View top 10 income transactions" className="col-span-1 row-span-1 bento-tile bg-sage-50 border border-sage-100 p-3.5 text-left animate-bento-in stagger-4 active:scale-95 transition-transform">
          <div className="h-full flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.income + "22", color: THEME.income }}>
              <ArrowDownRight size={14} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-sage-700">Income</p>
              <p className="text-sm font-bold text-sage-700 leading-tight">{formatRp(animatedIncome)}</p>
            </div>
          </div>
        </button>

        {/* Expense tile */}
        <button onClick={() => setDrillDown({ type: "expense", title: "Pengeluaran" })} aria-label="View top 10 expense transactions" className="col-span-1 row-span-1 bento-tile bg-clay-50 border border-clay-100 p-3.5 text-left animate-bento-in stagger-5 active:scale-95 transition-transform">
          <div className="h-full flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.expense + "22", color: THEME.expense }}>
              <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-clay-600">Expense</p>
              <p className="text-sm font-bold text-clay-600 leading-tight">{formatRp(animatedExpense)}</p>
            </div>
          </div>
        </button>

        {/* Savings tile */}
        <button onClick={() => setDrillDown({ type: "savings", title: "Tabungan" })} aria-label="View top 10 savings transactions" className="col-span-1 row-span-1 bento-tile bg-moss-50 border border-moss-100 p-3.5 text-left animate-bento-in stagger-6 active:scale-95 transition-transform">
          <div className="h-full flex flex-col justify-between">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: THEME.savings + "22", color: THEME.savings }}>
              <PiggyBank size={14} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-moss-600">Savings</p>
              <p className="text-sm font-bold text-moss-600 leading-tight">{formatRp(animatedSavings)}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="mt-6 animate-bento-in stagger-7">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={14} className="text-amber-500" aria-hidden="true" />
              <h3 className="text-sm font-bold font-display text-earth-800">Smart Insights</h3>
            </div>
            <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">{insights.length} baru</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {insights.map((ins, i) => {
              const Icon = ins.icon
              const TypeIcon = ins.type === "positive" ? TrendingUp : ins.type === "warning" ? AlertCircle : Info
              return (
                <div key={i} className="insight-card animate-fade-in-up" style={{ background: ins.color + "12", color: ins.color, animationDelay: `${0.05 * i}s` }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 relative" style={{ background: ins.color + "22", boxShadow: `0 4px 12px ${ins.color}30` }}>
                    <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: ins.color, color: "white" }}>
                      <TypeIcon size={9} strokeWidth={3} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{ins.type === "positive" ? "Positif" : ins.type === "warning" ? "Perhatian" : "Info"}</p>
                    <p className="text-sm font-semibold text-earth-800 leading-snug mt-0.5">{ins.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Spending gauge */}
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in stagger-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Spending Ratio</p>
            <p className="text-xs text-earth-600">Pengeluaran / Pemasukan</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: gaugeColor + "18", color: gaugeColor }}>
            {expenseRatio < 50 ? "Sehat" : expenseRatio < 80 ? "Moderat" : "Tinggi"}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible" role="img" aria-label={`Spending ratio ${expenseRatio.toFixed(1)} percent`}>
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={THEME.savings} />
                <stop offset="50%" stopColor={THEME.warning} />
                <stop offset="100%" stopColor={THEME.danger} />
              </linearGradient>
            </defs>
            <path d="M20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#ede0d0" strokeWidth="14" strokeLinecap="round" />
            <path d="M20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round"
              strokeDasharray="251 251"
              style={{ "--gauge-offset": `${(1 - gaugeAngle / 180) * 251}px`, animation: `gaugeFill 1.4s cubic-bezier(0.16, 1, 0.3, 1) both` }} />
            {(() => {
              const angleRad = (180 + gaugeAngle) * (Math.PI / 180)
              const cx = 100, cy = 100, len = 52
              const nx = cx + len * Math.cos(angleRad)
              const ny = cy + len * Math.sin(angleRad)
              return <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#2a2018" strokeWidth="3" strokeLinecap="round" />
            })()}
            <circle cx="100" cy="100" r="6" fill="#2a2018" />
          </svg>
          <p className="text-3xl font-display font-bold -mt-3" style={{ color: gaugeColor }}>{expenseRatio.toFixed(1)}%</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="mt-6 animate-bento-in stagger-9">
        <div className="flex justify-between items-end mb-3 px-1">
          <h3 className="text-base font-bold font-display text-earth-800">Recent</h3>
          <button onClick={() => setActiveNav("stats")} aria-label="View all transactions in Statistics" className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all">
            View All <ArrowRight size={12} aria-hidden="true" />
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
