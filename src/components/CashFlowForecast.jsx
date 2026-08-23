"use client"
import { useMemo, useState } from "react"
import { TrendingUp, Info } from "lucide-react"
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp, useCountUp } from "@/app/dashboard/_components/helpers"
import { computeForecast } from "@/lib/forecast"
import Sheet from "@/app/dashboard/_components/Sheet"

const FORMULA_COPY = "Proyeksi ini dihitung berdasarkan hingga enam bulan lengkap terakhir, dengan mempertimbangkan pola pemasukan, pengeluaran, tagihan, dan pembayaran terjadwal."
const SPECIAL_HISTORY_NOTE = "Riwayat Spesial tidak masuk baseline rutin."

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-xl p-3 shadow-warm border border-md3-outline-variant" style={{ background: THEME.surface }}>
      <p className="text-[10px] font-bold text-md3-on-surface-variant mb-1">{label}{d.isProjected ? " (proyeksi)" : ""}</p>
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

export default function CashFlowForecast({ monthlyData, routineMonthlyData, transactions, bills, billsLoading, billsError, now }) {
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const forecastMonthlyData = routineMonthlyData || monthlyData || []
  const forecast = useMemo(
    () => computeForecast(forecastMonthlyData, { transactions: transactions || [], bills: bills || [], now: new Date(now) }),
    [forecastMonthlyData, transactions, bills, now]
  )

  const animatedIncome = useCountUp(forecast.projectedIncome ?? 0, 1000)
  const animatedExpense = useCountUp(forecast.projectedExpense ?? 0, 1000)
  const animatedSurplus = useCountUp(forecast.projectedSurplus ?? 0, 1000)

  const handleChartKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    setIsInfoOpen(true)
  }

  if (billsLoading) {
    return (
      <div className="mt-6 bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm animate-bento-in" role="status" aria-live="polite">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Proyeksi Arus Kas</p>
        </div>
        <p className="text-sm text-md3-on-surface-variant">Memuat tagihan terjadwal…</p>
      </div>
    )
  }

  if (billsError) {
    return (
      <div className="mt-6 bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm animate-bento-in" role="status" aria-live="polite">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Proyeksi Arus Kas</p>
        </div>
        <p className="text-sm text-md3-on-surface-variant">Proyeksi arus kas belum tersedia.</p>
      </div>
    )
  }

  if (forecast.insufficientData) {
    return (
      <div className="mt-6 bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm animate-bento-in">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={14} className="text-earth-400" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Proyeksi Arus Kas</p>
        </div>
        <p className="text-sm text-md3-on-surface-variant">Butuh minimal 3 bulan lengkap untuk proyeksi.</p>
      </div>
    )
  }

  const surplusPositive = forecast.projectedSurplus >= 0

  return (
    <div className="mt-6 bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm animate-bento-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} className="text-violet-500" aria-hidden="true" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Proyeksi Arus Kas</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
            {forecast.projectionMonth} (proyeksi)
          </span>
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            aria-label="Info proyeksi arus kas"
            className="w-7 h-7 rounded-full bg-md3-surface text-md3-on-surface-variant hover:bg-md3-surface-container-high transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
          >
            <Info size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="rounded-2xl p-3 border" style={{ background: THEME.incomeBg, borderColor: THEME.income + "20" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-md3-on-surface-variant mb-0.5">Pemasukan</p>
          <p className="text-sm font-bold" style={{ color: THEME.income }}>{formatRp(animatedIncome)}</p>
        </div>
        <div className="rounded-2xl p-3 border" style={{ background: THEME.expenseBg, borderColor: THEME.expense + "20" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider text-md3-on-surface-variant mb-0.5">Pengeluaran</p>
          <p className="text-sm font-bold" style={{ color: THEME.expense }}>{formatRp(animatedExpense)}</p>
        </div>
        <div
          className="rounded-2xl p-3 border"
          style={{
            background: surplusPositive ? THEME.savingsBg : THEME.dangerBg,
            borderColor: (surplusPositive ? THEME.savings : THEME.danger) + "20",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-md3-on-surface-variant mb-0.5">Surplus</p>
          <p className="text-sm font-bold" style={{ color: surplusPositive ? THEME.savings : THEME.danger }}>
            {formatRp(animatedSurplus)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl p-3 mb-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
        style={{ background: THEME.surfaceMuted }}
        role="button"
        tabIndex={0}
        aria-label="Buka rumus proyeksi arus kas"
        onClick={() => setIsInfoOpen(true)}
        onKeyDown={handleChartKeyDown}
      >
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={forecast.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="cfActualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.primary} stopOpacity={0.2} />
                <stop offset="100%" stopColor={THEME.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.surfaceWarm} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9c8978", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={THEME.surfaceWarm} strokeDasharray="4 4" />
            {/* Actual surplus area + line */}
            <Area
              type="monotone"
              dataKey="surplusActual"
              stroke="none"
              fill="url(#cfActualGrad)"
              fillOpacity={1}
              animationBegin={200}
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="surplusActual"
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
              dataKey="surplusForecast"
              stroke={THEME.warning}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={({ cx, cy, payload }) => payload?.isProjected ? (
                <circle cx={cx} cy={cy} r={4} fill={THEME.warning} stroke="#fff" strokeWidth={2} />
              ) : null}
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
            <span className="text-[11px] font-semibold text-md3-on-surface-variant">Aktual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 rounded-full" style={{ background: THEME.warning, borderTop: "2px dashed" }} />
            <span className="text-[11px] font-semibold text-md3-on-surface-variant">Proyeksi</span>
          </div>
        </div>
        <p className="text-[11px] text-md3-on-surface-variant">
          Berdasarkan {forecast.monthsUsed} bulan lengkap
        </p>
      </div>

      <Sheet open={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Rumus Proyeksi Arus Kas">
        <p className="text-sm leading-relaxed text-md3-on-surface-variant">{FORMULA_COPY}</p>
        {forecast.specialHistoryExcluded && (
          <p className="mt-3 text-xs leading-relaxed text-md3-on-surface-variant">{SPECIAL_HISTORY_NOTE}</p>
        )}
      </Sheet>
    </div>
  )
}
