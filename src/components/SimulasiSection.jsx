"use client"
import { useMemo } from "react"
import { Calculator, PiggyBank, Scissors, Receipt, ArrowRight } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import { computeForecast } from "@/lib/forecast"
import { getWibDateParts } from "@/lib/wibCalendar"

const SAVE_AMOUNT = 500000

/**
 * Item 18 — Simulasi akhir bulan.
 *
 * Reuses the CashFlowForecast projection logic (computeForecast) to show a
 * projected end-of-month balance, then offers three tappable what-if
 * scenarios, each with its delta vs the baseline. "Terapkan skenario"
 * toasts a nudge and deep-links to the section where the user acts on it.
 */
export default function SimulasiSection({
  monthlyData = [],
  transactions = [],
  bills = [],
  availableBalance = 0,
  now,
  onApplyScenario,
}) {
  const forecast = useMemo(
    () => computeForecast(monthlyData, { transactions, bills, now: now || new Date() }),
    [monthlyData, transactions, bills, now]
  )

  const insufficient = forecast.insufficientData || forecast.projectedSurplus == null

  const currentParts = getWibDateParts(now || new Date())
  const currentMonthLabel = currentParts ? AVAILABLE_MONTHS[currentParts.monthIndex] : null
  const currentYearLabel = currentParts ? String(currentParts.year) : null

  // Current-month Jajan spend feeds the "Jajan −20%" scenario.
  const jajanSpend = useMemo(() => {
    if (!currentMonthLabel) return 0
    return (Array.isArray(transactions) ? transactions : [])
      .filter(
        (t) =>
          t?.type === "expense" &&
          t?.category === "Jajan" &&
          t?.month === currentMonthLabel &&
          String(t?.year) === currentYearLabel
      )
      .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0)
  }, [transactions, currentMonthLabel, currentYearLabel])

  const largestBill = useMemo(() => {
    const active = (Array.isArray(bills) ? bills : []).filter((b) => b?.aktif !== false)
    return active.reduce(
      (best, b) => (Number(b?.jumlah) || 0) > (Number(best?.jumlah) || 0) ? b : best,
      null
    )
  }, [bills])

  const baseline = insufficient ? null : availableBalance + forecast.projectedSurplus

  const scenarios = insufficient
    ? []
    : [
        {
          key: "save",
          icon: PiggyBank,
          title: "Nabung Rp 500 rb",
          description: "Sisihkan Rp 500.000 ke tabungan bulan ini.",
          delta: SAVE_AMOUNT,
        },
        {
          key: "cut",
          icon: Scissors,
          title: "Jajan −20%",
          description:
            jajanSpend > 0
              ? `Kurangi jajan 20% bulan ini — hemat ${formatRpFull(Math.round(jajanSpend * 0.2))}.`
              : "Kurangi jajan 20% bulan ini.",
          delta: Math.round(jajanSpend * 0.2),
        },
        ...(largestBill && Number(largestBill.jumlah) > 0
          ? [
              {
                key: "bill",
                icon: Receipt,
                title: `Tanpa ${largestBill.nama}`,
                description: `Lewati ${largestBill.nama} bulan ini.`,
                delta: Number(largestBill.jumlah),
              },
            ]
          : []),
      ]

  return (
    <div className="plan-section-shell animate-bento-in" data-testid="simulasi-section">
      <div className="plan-section-heading">
        <div className="plan-section-heading__title">
          <Calculator size={14} color={THEME.primary} aria-hidden="true" />
          <h2>Simulasi akhir bulan</h2>
        </div>
      </div>

      {insufficient ? (
        <div className="rounded-2xl border border-dashed border-md3-outline-variant p-5 text-center">
          <p className="text-sm font-bold text-md3-on-surface">Belum cukup data untuk simulasi</p>
          <p className="mt-1.5 text-xs leading-relaxed text-md3-on-surface-variant">
            Simulasi butuh minimal 3 bulan riwayat. Catat transaksi seperti biasa —
            proyeksi akhir bulan muncul otomatis.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl p-4 text-white" style={{ background: THEME.heroBg }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
              Proyeksi saldo akhir bulan
            </p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">
              {formatRpFull(baseline)}
            </p>
            <p className="mt-1 text-[11px] text-white/70">
              Saldo bisa dipakai {formatRpFull(availableBalance)} + proyeksi surplus{" "}
              {formatRpFull(forecast.projectedSurplus)}
            </p>
          </div>

          <div className="mt-3 space-y-2.5">
            <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-md3-on-surface-variant">
              Coba skenario
            </p>
            {scenarios.map((s) => {
              const Icon = s.icon
              const result = baseline + s.delta
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onApplyScenario?.(s.key)}
                  aria-label={`Terapkan skenario ${s.title}`}
                  className="plan-card w-full p-4 text-left transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: THEME.primaryBg, color: THEME.primary }}
                    >
                      <Icon size={16} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-md3-on-surface">{s.title}</p>
                      <p className="mt-0.5 text-[11px] text-md3-on-surface-variant">{s.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">
                            Hasil
                          </p>
                          <p className="font-display text-base font-bold tabular-nums text-md3-on-surface">
                            {formatRpFull(result)}
                          </p>
                        </div>
                        <span
                          className="rounded-full px-2 py-1 text-[11px] font-bold tabular-nums"
                          style={{ background: THEME.savingsBg, color: THEME.primary }}
                        >
                          +{formatRpFull(s.delta)}
                        </span>
                      </div>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-violet-600">
                        Terapkan skenario <ArrowRight size={12} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
