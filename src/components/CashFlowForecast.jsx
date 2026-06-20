"use client"
import { useMemo } from "react"
import { TrendingUp, ArrowDownRight, ArrowUpRight, Info, Wallet } from "lucide-react"
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp, useCountUp } from "@/app/dashboard/_components/helpers"
import { computeForecast } from "@/lib/forecast"

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-xl p-3 shadow-warm border border-earth-100" style={{ background: THEME.surface }}>
      <p className="text-[10px] font-bold text-earth-500 mb-1">{label}{d.isProjected ? " (proyeksi)" : ""}</p>
      <p className="text-xs font-bold" style={{ color: THEME.income }}>
        Pemasukan: {formatRp(d.pemasukan)}
      </p>
      <p className="text-xs font-bold" style={{ color: THEME.expense }}>
        Pengeluaran: {formatRp(d.pengeluaran)}
      </p>
      <p className="text-xs font-bold" style={{ color: d.surplus >= 0 ? THEME.savings : THEME.danger }}>
        Surplus: {formatRp(d.surplus)}
      </p>
    </div>
  )
}

export default function CashFlowForecast({ monthlyData }) {
  const forecast = useMemo(() => computeForecast(monthlyData || []), [monthlyData])

  const animatedIncome = useCountUp(forecast.projectedIncome, 1000)
  const animatedExpense = useCountUp(forecast.projectedExpense, 1000)
  const animatedSurplus = useCountUp(forecast.projectedSurplus, 1000)

  if (forecast.insufficientData) {
    return (
      <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Proyeksi Arus Kas</p>
        </div>
        <p className="text-sm text-earth-500">Butuh minimal 2 bulan data untuk proyeksi.</p>
      </div>
    )
  }

  const surplusPositive = forecast.projectedSurplus >= 0

  return (
    <div className="mt-6 bento-tile bg-white border border-earth-100 p-5 shadow-warm animate-bento-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} className="text-violet-500" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Proyeksi Arus Kas</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
          {forecast.projectionMonth} (proyeksi)
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="rounded-2xl p-3 border" style={{ background: THEME.incomeBg, borderColor: THEME.income + "20" }}>
          <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Pemasukan</p>
          <p className="text-sm font-bold" style={{ color: THEME.income }}>{formatRp(animatedIncome)}</p>
        </div>
        <div className="rounded-2xl p-3 border" style={{ background: THEME.expenseBg, borderColor: THEME.expense + "20" }}>
          <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Pengeluaran</p>
          <p className="text-sm font-bold" style={{ color: THEME.expense }}>{formatRp(animatedExpense)}</p>
        </div>
        <div
          className="rounded-2xl p-3 border"
          style={{
            background: surplusPositive ? THEME.savingsBg : THEME.dangerBg,
            borderColor: (surplusPositive ? THEME.savings : THEME.danger) + "20",
          }}
        >
          <p className="text-[8px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">Surplus</p>
          <p className="text-sm font-bold" style={{ color: surplusPositive ? THEME.savings : THEME.danger }}>
            {formatRp(animatedSurplus)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-3 mb-3" style={{ background: THEME.surfaceMuted }}>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={forecast.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="cfActualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.primary} stopOpacity={0.2} />
                <stop offset="100%" stopColor={THEME.primary} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cfConfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.warning} stopOpacity={0.18} />
                <stop offset="100%" stopColor={THEME.warning} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.surfaceWarm} vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#9c8978", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={THEME.surfaceWarm} strokeDasharray="4 4" />
            {/* Confidence band (projected area) */}
            {forecast.chartData.some((d) => d.isProjected) && (
              <>
                <Area
                  type="monotone"
                  dataKey="surplusHigh"
                  stroke="none"
                  fill="url(#cfConfGrad)"
                  fillOpacity={1}
                  animationBegin={400}
                  animationDuration={800}
                />
                <Area
                  type="monotone"
                  dataKey="surplusLow"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                  animationBegin={400}
                  animationDuration={800}
                />
              </>
            )}
            {/* Actual surplus area + line */}
            <Area
              type="monotone"
              dataKey={(d) => (d.isProjected ? null : d.surplus)}
              stroke="none"
              fill="url(#cfActualGrad)"
              fillOpacity={1}
              animationBegin={200}
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey={(d) => (d.isProjected ? null : d.surplus)}
              stroke={THEME.primary}
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: THEME.primary, strokeWidth: 2, stroke: "#fff" }}
              connectNulls={false}
              animationBegin={200}
              animationDuration={800}
            />
            {/* Projected surplus dashed line */}
            <Line
              type="monotone"
              dataKey={(d) => (d.isProjected ? d.surplus : null)}
              stroke={THEME.warning}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 4, fill: THEME.warning, strokeWidth: 2, stroke: "#fff", strokeDasharray: "none" }}
              connectNulls={false}
              animationBegin={600}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + footnote */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 rounded-full" style={{ background: THEME.primary }} />
            <span className="text-[9px] font-semibold text-earth-600">Aktual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 rounded-full" style={{ background: THEME.warning, borderTop: "2px dashed" }} />
            <span className="text-[9px] font-semibold text-earth-600">Proyeksi</span>
          </div>
        </div>
        <p className="text-[9px] text-earth-500">
          Rata-rata {forecast.monthsUsed} bulan terakhir
        </p>
      </div>
    </div>
  )
}
