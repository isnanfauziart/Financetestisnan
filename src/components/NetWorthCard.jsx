"use client"
import { useState } from "react"
import { Wallet, TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull, useCountUp } from "@/app/dashboard/_components/helpers"
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts"

export default function NetWorthCard({ netWorth = 0, netWorthMonthlyDelta = 0, netWorthHistory = [] }) {
  const animated = useCountUp(netWorth)
  const [showTooltip, setShowTooltip] = useState(false)

  const isPositive = netWorthMonthlyDelta > 0
  const isNegative = netWorthMonthlyDelta < 0
  const deltaColor = isPositive ? THEME.savings : isNegative ? THEME.danger : THEME.textTertiary
  const DeltaIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  const series = (netWorthHistory || []).slice(-12).map(d => ({ x: `${d.month} ${String(d.year).slice(-2)}`, v: d.value }))

  return (
    <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm relative animate-bento-in stagger-7">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: THEME.savings + "18", color: THEME.savings }}>
            <Wallet size={13} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-earth-500">Net Worth</p>
        </div>
        <button
          onClick={() => setShowTooltip(s => !s)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label="Net worth formula explanation"
          className="w-6 h-6 rounded-full hover:bg-earth-50 flex items-center justify-center text-earth-400 hover:text-earth-600 transition-colors relative"
        >
          <HelpCircle size={13} aria-hidden="true" />
          {showTooltip && (
            <span className="absolute top-full right-0 mt-2 w-56 glass-strong rounded-2xl p-3 shadow-pop-lg text-[11px] font-medium text-earth-700 leading-relaxed z-30 text-left" role="tooltip">
              <strong className="block text-earth-800 mb-1">Net Worth formula</strong>
              (Income − Expense) + Savings — dihitung kumulatif sejak transaksi pertama.
            </span>
          )}
        </button>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-display font-bold text-earth-900 tracking-tight leading-none animate-count-in">
            {formatRpFull(animated)}
          </h2>
          <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: deltaColor }}>
            <DeltaIcon size={11} aria-hidden="true" />
            {netWorthMonthlyDelta === 0 ? "No change this month" : `${isPositive ? "+" : ""}${formatRp(netWorthMonthlyDelta)} this month`}
          </p>
        </div>
        {series.length > 0 && (
          <div className="w-32 h-14 flex-shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 4, right: 0, bottom: 4, left: 0 }}>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Line type="monotone" dataKey="v" stroke={THEME.savings} strokeWidth={2.5} dot={false} animationDuration={1200} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
