"use client"
import { useMemo } from "react"
import { TrendingUp, TrendingDown, PiggyBank, Info } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRp, useCountUp } from "@/app/dashboard/_components/helpers"

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  const color = d.rate >= 20 ? THEME.income : d.rate >= 10 ? THEME.warning : THEME.danger
  return (
    <div className="rounded-xl p-3 shadow-warm border border-earth-100" style={{ background: THEME.surface }}>
      <p className="text-[10px] font-bold text-earth-500 mb-1">{label}</p>
      <p className="text-xs font-bold" style={{ color }}>
        Savings Rate: {d.rate.toFixed(1)}%
      </p>
      <p className="text-[10px] text-earth-500 mt-0.5">
        Income: {formatRp(d.income)} · Expense: {formatRp(d.expense)}
      </p>
    </div>
  )
}

export default function SavingsRateTrend({ monthlyData }) {
  const chartData = useMemo(() => {
    if (!monthlyData || monthlyData.length < 2) return []
    return monthlyData
      .filter(m => m.pemasukan > 0)
      .slice(-12)
      .map(m => ({
        label: m.year ? `${m.month} ${m.year}` : m.month,
        rate: ((m.pemasukan - m.pengeluaran) / m.pemasukan) * 100,
        income: m.pemasukan,
        expense: m.pengeluaran,
      }))
  }, [monthlyData])

  const currentRate = chartData.length > 0 ? chartData[chartData.length - 1].rate : 0
  const animatedRate = useCountUp(Math.round(currentRate * 10), 1000) / 10

  const trend = useMemo(() => {
    if (chartData.length < 3) return { direction: "flat", delta: 0 }
    const recent3 = chartData.slice(-3)
    const avg3 = recent3.reduce((s, d) => s + d.rate, 0) / 3
    const prev3 = chartData.slice(-6, -3)
    if (prev3.length === 0) return { direction: "flat", delta: 0 }
    const avgPrev = prev3.reduce((s, d) => s + d.rate, 0) / prev3.length
    const delta = avg3 - avgPrev
    return {
      direction: delta > 1 ? "up" : delta < -1 ? "down" : "flat",
      delta,
    }
  }, [chartData])

  const stats = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, best: 0, worst: 0 }
    const rates = chartData.map(d => d.rate)
    return {
      avg: rates.reduce((s, v) => s + v, 0) / rates.length,
      best: Math.max(...rates),
      worst: Math.min(...rates),
    }
  }, [chartData])

  if (chartData.length < 2) {
    return (
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
        <div className="flex items-center gap-1.5 mb-2">
          <PiggyBank size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Savings Rate Trend</p>
        </div>
        <p className="text-sm text-earth-500">Butuh minimal 2 bulan data untuk menampilkan tren.</p>
      </div>
    )
  }

  const rateColor = currentRate >= 20 ? THEME.income : currentRate >= 10 ? THEME.warning : THEME.danger

  return (
    <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <PiggyBank size={14} color={THEME.savings} aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Savings Rate Trend</p>
        </div>
        {trend.direction !== "flat" && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              background: trend.direction === "up" ? THEME.incomeBg : THEME.dangerBg,
              color: trend.direction === "up" ? THEME.income : THEME.danger,
            }}
          >
            {trend.direction === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend.direction === "up" ? "+" : ""}{trend.delta.toFixed(1)}% avg 3bln
          </span>
        )}
      </div>

      {/* Current rate */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-display font-bold tracking-tight" style={{ color: rateColor }}>
          {animatedRate.toFixed(1)}%
        </span>
        <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">
          {currentRate >= 20 ? "Sangat Baik" : currentRate >= 10 ? "Cukup" : "Perlu Ditingkatkan"}
        </span>
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-3 mb-3" style={{ background: THEME.surfaceMuted }}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="srGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.savings} stopOpacity={0.2} />
                <stop offset="100%" stopColor={THEME.savings} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.surfaceWarm} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#9c8978", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={20} stroke={THEME.income} strokeDasharray="4 4" strokeOpacity={0.5} />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="none"
              fill="url(#srGrad)"
              fillOpacity={1}
              animationBegin={200}
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={THEME.savings}
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload } = props
                const color = payload.rate >= 20 ? THEME.income : payload.rate >= 10 ? THEME.warning : THEME.danger
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    strokeWidth={2}
                    stroke="#fff"
                  />
                )
              }}
              animationBegin={200}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl p-2.5 text-center" style={{ background: THEME.surfaceWarm }}>
          <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Rata-rata</p>
          <p className="text-sm font-bold text-earth-700">{stats.avg.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl p-2.5 text-center" style={{ background: THEME.incomeBg }}>
          <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Terbaik</p>
          <p className="text-sm font-bold" style={{ color: THEME.income }}>{stats.best.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl p-2.5 text-center" style={{ background: THEME.surfaceWarm }}>
          <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Terendah</p>
          <p className="text-sm font-bold" style={{ color: THEME.danger }}>{stats.worst.toFixed(1)}%</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 rounded-full" style={{ background: THEME.income }} />
            <span className="text-[9px] font-semibold text-earth-600">≥ 20% target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 rounded-full" style={{ background: THEME.warning }} />
            <span className="text-[9px] font-semibold text-earth-600">10-20%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 rounded-full" style={{ background: THEME.danger }} />
            <span className="text-[9px] font-semibold text-earth-600">&lt; 10%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
