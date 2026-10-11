/**
 * Trailing-window slicing for the Statistik → Tren charts.
 *
 * The per-card range chips (6 bln / 12 bln / Semua) all share one semantic:
 * show the last N complete months ending at an anchor month.
 *
 * - `span`: 6 | 12 | null. `null` means "Semua" — everything up to the anchor.
 * - `anchor`: `{ month: "Oktober", year: "2026" }` | null.
 *   `null` keeps the legacy behavior: the window ends at the last entry.
 *   When the anchor month can't be found the window also ends at the last
 *   entry. A null/"Semua Tahun" year matches the latest entry with that
 *   month name.
 *
 * The input series must be chronological ascending. Entries need `month`
 * (Indonesian month name); `year` is only used for anchor matching.
 */
export function sliceWindowEnd(series, { span = null, anchor = null } = {}) {
  const rows = Array.isArray(series) ? series : []
  if (rows.length === 0) return []

  let endIdx = rows.length - 1
  if (anchor && anchor.month) {
    const wantYear =
      anchor.year == null || anchor.year === "Semua Tahun" ? null : String(anchor.year)
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i] || {}
      if (row.month !== anchor.month) continue
      if (wantYear !== null && String(row.year) !== wantYear) continue
      endIdx = i
      break
    }
  }

  const windowed = rows.slice(0, endIdx + 1)
  if (span == null) return windowed
  return windowed.slice(-span)
}

/**
 * Human label for a windowed series, e.g. "Mei – Okt 2026".
 * Entries without a `year` fall back to `fallbackYear` (may be null).
 */
export function formatWindowLabel(windowed, fallbackYear = null) {
  if (!windowed || windowed.length === 0) return ""
  const fmt = (row) => {
    const year = row.year ?? fallbackYear
    return year ? `${row.month} ${year}` : String(row.month)
  }
  if (windowed.length === 1) return fmt(windowed[windowed.length - 1])
  return `${fmt(windowed[0])} – ${fmt(windowed[windowed.length - 1])}`
}

/** Map a chip label to its month count (null = "Semua"). */
export const TREND_SPAN_MONTHS = { "6 bln": 6, "12 bln": 12, "Semua": null }
export const TREND_SPAN_OPTIONS = ["6 bln", "12 bln", "Semua"]

/**
 * Resolve a chip label to a month count. Unknown labels fall back to 6.
 * (Deliberately not `?? 6`: "Semua" maps to null and must stay null.)
 */
export function spanMonthsFor(spanLabel) {
  return spanLabel in TREND_SPAN_MONTHS ? TREND_SPAN_MONTHS[spanLabel] : 6
}
