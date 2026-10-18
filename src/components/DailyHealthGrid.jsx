"use client"
import { Receipt, Wallet, BellRing, PiggyBank, ArrowRight } from "lucide-react"
import { formatRp, maskRupiah } from "@/app/dashboard/_components/helpers"

/**
 * Item 12 — Daily Financial Health 2×2 grid for Beranda.
 * Four quiet tiles, each deep-linking to its detail surface:
 * spent today → Statistik, rest of month → Rencana, bills due → Tagihan,
 * saved → Target. All data points already exist in the app; this component
 * is presentation only.
 */
export default function DailyHealthGrid({
  spentToday = 0,
  monthLeft = 0,
  billsDueCount = 0,
  billsDueAmount = 0,
  savedMonth = 0,
  moneyHidden = false,
  onOpenStats,
  onOpenPlan,
}) {
  const masked = (formatted) => (moneyHidden ? maskRupiah(formatted) : formatted)

  const tiles = [
    {
      key: "spent",
      label: "Terpakai hari ini",
      value: masked(formatRp(spentToday)),
      icon: Receipt,
      tint: "bg-orange-50 text-orange-700 border-orange-100",
      onClick: () => onOpenStats?.(),
      aria: `Lihat transaksi hari ini di Statistik, total ${masked(formatRp(spentToday))}`,
    },
    {
      key: "left",
      label: "Sisa bulan ini",
      value: masked(formatRp(monthLeft)),
      icon: Wallet,
      tint: "bg-teal-50 text-teal-700 border-teal-100",
      onClick: () => onOpenPlan?.("overview"),
      aria: `Buka Rencana, sisa bulan ini ${masked(formatRp(monthLeft))}`,
    },
    {
      key: "bills",
      label: "Tagihan jatuh tempo",
      value: billsDueCount > 0 ? `${billsDueCount} tagihan` : "Aman",
      sub: billsDueCount > 0 ? masked(formatRp(billsDueAmount)) : undefined,
      icon: BellRing,
      tint: "bg-rose-50 text-rose-600 border-rose-100",
      onClick: () => onOpenPlan?.("tagihan"),
      aria: `Buka Tagihan di Rencana, ${billsDueCount} jatuh tempo`,
    },
    {
      key: "saved",
      label: "Ditabung bulan ini",
      value: masked(formatRp(savedMonth)),
      icon: PiggyBank,
      tint: "bg-violet-50 text-violet-700 border-violet-100",
      onClick: () => onOpenPlan?.("goal"),
      aria: `Buka Target di Rencana, tabungan bulan ini ${masked(formatRp(savedMonth))}`,
    },
  ]

  return (
    <section aria-labelledby="daily-health-title" data-testid="home-daily-health">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h3 id="daily-health-title" className="text-sm font-bold font-display text-md3-on-surface sm:text-base">
          Kesehatan keuangan harian
        </h3>
        <button
          type="button"
          onClick={() => onOpenStats?.()}
          aria-label="Buka Statistik untuk detail kesehatan harian"
          className="flex min-h-11 items-center gap-1 text-[11px] font-bold text-violet-600 transition-all hover:gap-2"
        >
          Lihat semua <ArrowRight size={12} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <button
              key={tile.key}
              type="button"
              onClick={tile.onClick}
              aria-label={tile.aria}
              className="rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest p-3.5 text-left shadow-warm transition-transform active:scale-[0.98]"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${tile.tint}`}>
                <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
              </div>
              <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-md3-on-surface-variant">
                {tile.label}
              </p>
              <p className="mt-1 text-base font-bold tabular-nums text-md3-on-surface">{tile.value}</p>
              {tile.sub && (
                <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-md3-on-surface-variant">{tile.sub}</p>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
