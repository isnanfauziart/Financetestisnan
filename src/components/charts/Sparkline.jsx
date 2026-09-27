"use client"
import { useId } from "react"

/**
 * Inline SVG sparkline (revamp B) — no Recharts overhead for mini trends.
 *
 * - `points`: array of numbers (null renders as a gap the line connects past)
 * - `mode: "line"` single stroke; `mode: "area"` adds a soft gradient fill
 * - `endDot` highlights the latest point (hero sparkline)
 */
export function Sparkline({
  points = [],
  mode = "line",
  width = 96,
  height = 32,
  color = "#6E59B5",
  endDot = false,
  strokeWidth = 2,
  ariaHidden = true,
  className = "",
}) {
  const gradientId = useId()
  const numeric = points.filter(value => value != null && Number.isFinite(Number(value)))
  const hasData = numeric.length > 0
  const max = hasData ? Math.max(...numeric) : 1
  const min = hasData ? Math.min(...numeric) : 0
  const span = max - min || 1

  const padY = strokeWidth + 2
  const usableHeight = Math.max(1, height - padY * 2)
  const lastIndex = points.length - 1
  const xAt = index => (lastIndex === 0 ? width / 2 : (index / lastIndex) * (width - strokeWidth * 2) + strokeWidth)
  const yAt = value => padY + (1 - (Number(value) - min) / span) * usableHeight

  const segments = []
  let current = []
  points.forEach((value, index) => {
    if (value == null || !Number.isFinite(Number(value))) {
      if (current.length > 0) segments.push(current)
      current = []
    } else {
      current.push({ x: xAt(index), y: yAt(value) })
    }
  })
  if (current.length > 0) segments.push(current)

  const linePath = segments
    .map(segment => segment
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(" "))
    .join(" ")

  const firstSegment = segments[0] || []
  const lastSegment = segments[segments.length - 1] || []
  const areaPath = hasData && mode === "area" && lastSegment.length > 1
    ? `${lastSegment.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")} L${lastSegment[lastSegment.length - 1].x.toFixed(1)},${height} L${lastSegment[0].x.toFixed(1)},${height} Z`
    : null

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden={ariaHidden || undefined}
      focusable="false"
    >
      {mode === "area" && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
      )}
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
      {firstSegment.length > 0 && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {endDot && lastSegment.length > 0 && (
        <circle
          cx={lastSegment[lastSegment.length - 1].x}
          cy={lastSegment[lastSegment.length - 1].y}
          r={strokeWidth + 0.5}
          fill={color}
        />
      )}
    </svg>
  )
}

/**
 * Horizontal dumbbell row set (revamp B) — replaces the grouped comparison
 * bars: per category, one dot for period A and one for period B joined by a
 * stem. Both periods are expenses, so both dots use neutral period colors
 * (passed by the caller) instead of semantic income/expense green-vs-clay.
 *
 * `rows`: [{ a, b }] — null/missing renders as a single dot.
 * `domain`: [min, max] shared value scale across all rows.
 */
export function DumbbellChart({
  rows = [],
  domain = [0, 1],
  width = 240,
  rowHeight = 34,
  colorA = "#6E59B5",
  colorB = "#C8BEB1",
  dotRadius = 4,
  formatValue = undefined,
  ariaHidden = true,
  className = "",
}) {
  const height = Math.max(rowHeight, rows.length * rowHeight)
  const [min, max] = domain
  const span = max - min || 1
  const padX = dotRadius * 3
  const usableWidth = Math.max(1, width - padX * 2)
  const xAt = value => padX + ((Number(value) - min) / span) * usableWidth
  const yAt = rowIndex => rowIndex * rowHeight + rowHeight / 2

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden={ariaHidden || undefined}
      focusable="false"
    >
      {rows.map((row, index) => {
        const hasA = row.a != null && Number.isFinite(Number(row.a))
        const hasB = row.b != null && Number.isFinite(Number(row.b))
        if (!hasA && !hasB) return null
        const y = yAt(index)
        const aX = hasA ? xAt(row.a) : null
        const bX = hasB ? xAt(row.b) : null
        return (
          <g key={index}>
            {hasA && hasB && aX !== bX && (
              <line
                x1={Math.min(aX, bX)}
                x2={Math.max(aX, bX)}
                y1={y}
                y2={y}
                stroke={colorA}
                strokeOpacity="0.35"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}
            {hasA && <circle cx={aX} cy={y} r={dotRadius} fill={colorA} stroke="none" />}
            {hasB && <circle cx={bX} cy={y} r={dotRadius} fill={colorB} stroke="none" />}
            {formatValue && hasA && (
              <text x={aX} y={y - dotRadius - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" opacity="0.65">
                {formatValue(row.a)}
              </text>
            )}
            {formatValue && hasB && (
              <text x={bX} y={y - dotRadius - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" opacity="0.85">
                {formatValue(row.b)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default Sparkline
