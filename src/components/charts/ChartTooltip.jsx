"use client"
import { getChartSchemeIsDark, resolveChartTheme } from "@/lib/chartTheme"

/**
 * Single shared tooltip for every chart in the kit (replaces the divergent
 * copies that previously lived in _components/CustomTooltip consumers,
 * CashFlowForecast, and SavingsRateTrend). Recharts passes `active`,
 * `payload`, and `label`.
 *
 * Two modes:
 * - Default: render every non-null Recharts payload entry (name + value).
 * - `entries`: row-object mode. Values are read from `payload[0].payload`
 *   (the data row), so a tooltip can show fields that are not rendered
 *   series (e.g. income/expense behind a surplus line). Each entry:
 *     { key, label, color?: string | (row) => string, format?: (value) => string }
 *   Entries whose row value is null/undefined are omitted so dashed forecast
 *   lines don't render ghost rows.
 *
 * `unit: "%"` and `formatValue` are fallbacks for the default mode.
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  formatValue = undefined,
  unit = undefined,
  entries = undefined,
  footer = undefined,
}) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null

  const isDark = getChartSchemeIsDark()
  const theme = resolveChartTheme(isDark)

  const visible = entries
    ? (() => {
        const row = payload[0]?.payload
        if (!row) return []
        return entries
          .map(entry => {
            const value = row[entry.key]
            if (value == null) return null
            const color = typeof entry.color === "function" ? entry.color(row) : entry.color
            return { name: entry.label, color: color || theme.textSecondary, value, format: entry.format }
          })
          .filter(Boolean)
      })()
    : payload
        .filter(point => point.value != null)
        .map(point => ({
          name: point.name,
          color: point.color || point.stroke || theme.textSecondary,
          value: point.value,
          format: undefined,
        }))

  if (visible.length === 0) return null

  const renderValue = row => {
    if (row.format) return row.format(row.value)
    if (formatValue) return formatValue(row.value)
    if (unit === "%") return `${Number(row.value).toFixed(1)}%`
    return `Rp ${Number(row.value).toLocaleString("id-ID")}`
  }

  return (
    <div
      className="rounded-xl border p-3 text-xs shadow-warm"
      style={{
        background: theme.surface,
        borderColor: theme.border,
        color: theme.textPrimary,
      }}
    >
      {label != null && label !== "" && (
        <p className="mb-1.5 text-[11px] font-bold" style={{ color: theme.textSecondary }}>{label}</p>
      )}
      {visible.map(row => (
        <p key={row.name} className="font-medium" style={{ color: row.color }}>
          {row.name}
          {": "}
          <span className="font-bold" style={{ color: theme.textPrimary }}>{renderValue(row)}</span>
        </p>
      ))}
      {footer && (
        <p className="mt-1.5 text-[10px]" style={{ color: theme.textSecondary }}>{footer}</p>
      )}
    </div>
  )
}
