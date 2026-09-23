"use client"
import Sheet from "@/app/dashboard/_components/Sheet"
import { BALANCE_COPY } from "@/app/dashboard/_components/balanceCopy"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull } from "@/app/dashboard/_components/helpers"

/**
 * Wave 6 — reusable balance-detail surface.
 *
 * Rincian saldo lives behind a clear action from the Beranda hero (decision
 * 19): the hero stays a headline, and this sheet explains exactly how the hero
 * numbers come together — checkpoint cash, Saldo Tercatat, the three savings
 * concepts, debts, informational unpaid bills, available money, and any
 * allocation shortfall. Rows are built by `buildRincianRows`; this component
 * only renders them.
 */
export default function BalanceDetailSheet({ open, onClose, rows = [], estimate = false, guardBlocked = false, guardMessage = null }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel="Rincian saldo"
      title="Rincian saldo"
      subtitle="Beranda"
      size="md"
      maxHeight="85vh"
    >
      <p className="mb-3 px-1 text-[11px] text-md3-on-surface-variant">Dari mana angka utama di Beranda berasal.</p>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`flex items-start justify-between gap-3 rounded-2xl px-3 py-2 ${row.emphasis ? "bg-md3-surface-container-high" : ""}`}
          >
            <dt className="min-w-0">
              <span className="block text-xs font-semibold text-md3-on-surface">{row.label}</span>
              {row.note && <span className="mt-0.5 block text-[10px] leading-snug text-md3-on-surface-variant">{row.note}</span>}
              {row.count > 0 && <span className="mt-0.5 block text-[10px] text-md3-on-surface-variant">{row.count} catatan</span>}
            </dt>
            <dd
              className="flex-shrink-0 text-sm font-bold tabular-nums"
              style={{ color: row.negative ? THEME.danger : undefined }}
            >
              {row.negative ? "−" : ""}{formatRpFull(row.value)}
            </dd>
          </div>
        ))}
      </dl>
      {estimate && (
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-md3-on-surface-variant">{BALANCE_COPY.estimateNote}</p>
      )}
      {guardBlocked && (
        <p role="alert" className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          {guardMessage}
        </p>
      )}
    </Sheet>
  )
}
