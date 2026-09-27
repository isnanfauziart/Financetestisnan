"use client"
import StatsDataTable from "@/app/dashboard/_components/StatsDataTable"
import EmptyState from "@/app/dashboard/_components/EmptyState"

/**
 * Shared wrapper for every chart section in Statistik (revamp A): title +
 * optional basis note and badge, chart body, legend row, and the
 * keyboard-operable disclosure data table (Wave 7). Centralizes the
 * skeleton/empty states so each section can't drift into a different pattern.
 *
 * `legend` renders the accessible legend row items:
 *   { label, kind: "swatch" | "line" | "dash", color }
 */
export default function ChartTile({
  title,
  titleId = undefined,
  ariaLabel = undefined,
  basis = undefined,
  badge = undefined,
  legend = [],
  loading = false,
  isEmpty = false,
  emptyIcon = null,
  emptyTitle = "Belum ada data",
  emptyHint = undefined,
  table = undefined,
  skeletonHeight = 220,
  className = "",
  headingLevel = "h3",
  children,
}) {
  if (loading) {
    return (
      <div
        className={`bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="shimmer-bg rounded-2xl" style={{ height: skeletonHeight }} aria-hidden="true" />
      </div>
    )
  }

  const Heading = headingLevel

  return (
    <section
      aria-label={ariaLabel}
      className={`bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 sm:p-5 shadow-warm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading id={titleId} className="text-sm font-bold font-display text-md3-on-surface">{title}</Heading>
          {basis && <p className="mt-1 text-[11px] text-md3-on-surface-variant">{basis}</p>}
        </div>
        {badge && (
          <span className="flex-shrink-0 rounded-full bg-md3-surface px-2.5 py-1 text-[10px] font-bold text-md3-on-surface-variant">
            {badge}
          </span>
        )}
      </div>

      {!isEmpty && legend.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-md3-on-surface-variant">
          {legend.map(item => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              {item.kind === "swatch" ? (
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} aria-hidden="true" />
              ) : item.kind === "dash" ? (
                <span
                  className="inline-block w-5"
                  style={{ borderTop: `2px dashed ${item.color}` }}
                  aria-hidden="true"
                />
              ) : (
                <span className="w-5 border-t-2" style={{ borderColor: item.color }} aria-hidden="true" />
              )}
              {item.label}
            </span>
          ))}
        </div>
      )}

      {isEmpty ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />
      ) : (
        children
      )}

      {table && <StatsDataTable {...table} />}
    </section>
  )
}
