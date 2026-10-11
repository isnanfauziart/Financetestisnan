"use client"
import { useMemo } from "react"
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, CartesianGrid, Tooltip } from "recharts"
import { formatRp, formatRpFull, maskRupiah } from "@/app/dashboard/_components/helpers"

function shortLabel(point, prev) {
  const yy = String(point.year ?? "").slice(-2)
  if (!prev || prev.year !== point.year) return `${point.month} ${yy}`.trim()
  return point.month
}

function fullLabel(point) {
  return `${point.month} ${point.year}`.trim()
}

function TrendTooltip({ active, payload, moneyHidden }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  if (!point) return null
  const value = moneyHidden ? maskRupiah(formatRpFull(point.value)) : formatRpFull(point.value)
  return (
    <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-bold text-md3-on-surface shadow-warm">
      {fullLabel(point)} · {value}
    </div>
  )
}

// Month-end net worth trend for the Statistik Ringkasan view.
// history: [{ key, month, year, value }] — monthly snapshots, oldest first.
// Renders nothing fancy under 2 points: an honest empty state instead.
export default function NetWorthTrend({ history = [], moneyHidden = false }) {
  const points = useMemo(() => {
    const sorted = [...(history || [])]
      .filter((p) => p && Number.isFinite(Number(p.value)))
      .sort((a, b) => String(a.key ?? "").localeCompare(String(b.key ?? "")))
    return sorted.map((p, i) => ({
      ...p,
      value: Number(p.value),
      label: shortLabel(p, sorted[i - 1]),
    }))
  }, [history])

  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)

  if (points.length < 2) {
    return (
      <section aria-label="Tren kekayaan bersih">
        <div className="-mx-5 bg-[var(--surface-warm)] px-5 py-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">Kekayaan bersih</p>
          <div className="mt-3 rounded-[18px] border-[1.5px] border-dashed border-[var(--border-warm)] px-6 py-8 text-center">
            <p className="text-sm font-bold text-md3-on-surface">Belum cukup riwayat</p>
            <p className="mt-1.5 text-xs leading-relaxed text-md3-on-surface-variant">
              Chart muncul setelah dua bulan tercatat. Simpan total saldo di Profil setiap bulan.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const first = points[0]
  const last = points[points.length - 1]
  const delta = last.value - first.value
  const up = delta >= 0
  const line = up ? "var(--income)" : "var(--expense)"
  const sign = delta < 0 ? "−" : "+"
  const chip = `${sign}${masked(formatRp(Math.abs(delta)))} · ${points.length} bln`

  // Past ~12 points the month labels thin to every 3rd; the data never does.
  const interval = points.length > 12 ? 2 : 0

  const renderDot = (props) => {
    const { cx, cy, index } = props
    const isLast = index === points.length - 1
    return (
      <g key={`nw-dot-${index}`}>
        {isLast && <circle cx={cx} cy={cy} r={10} fill="none" stroke={line} strokeWidth={1.5} opacity={0.35} />}
        <circle cx={cx} cy={cy} r={isLast ? 5 : 3.5} fill={isLast ? line : "var(--surface-warm)"} stroke={line} strokeWidth={2} />
      </g>
    )
  }

  const summary = `Kekayaan bersih ${fullLabel(last)} ${formatRpFull(last.value)}, ${up ? "naik" : "turun"} ${formatRp(Math.abs(delta))} dalam ${points.length} bulan`

  return (
    <section aria-label="Tren kekayaan bersih">
      <div className="-mx-5 bg-[var(--surface-warm)] px-5 py-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">Kekayaan bersih</p>
          <p className="mt-2 font-display text-4xl font-black tabular-nums text-md3-on-surface">{masked(formatRpFull(last.value))}</p>
          <p className="mt-2">
            <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${up ? "bg-sage-100 text-sage-700" : "bg-clay-100 text-clay-600"}`}>{chip}</span>
          </p>
        </div>
        <div className="mt-3" role="img" aria-label={summary}>
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                interval={interval}
                tick={{ fill: "var(--md-sys-color-on-surface-variant)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <Tooltip content={<TrendTooltip moneyHidden={moneyHidden} />} cursor={{ stroke: "var(--border-warm)", strokeWidth: 1 }} />
              <Area type="monotone" dataKey="value" fill={line} fillOpacity={0.08} stroke="none" isAnimationActive={false} />
              <Line type="monotone" dataKey="value" stroke={line} strokeWidth={2.5} dot={renderDot} activeDot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
