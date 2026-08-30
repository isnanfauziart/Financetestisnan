"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Plus, Radar, X } from "lucide-react"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import { findRecurringExpenses } from "@/lib/recurringExpenses"

export default function RecurringExpenseRadar({ transactions = [], bills = [], dismissedFingerprints = [], now, onAdd, onDismiss }) {
  const [localDismissals, setLocalDismissals] = useState([])
  const [busyFingerprint, setBusyFingerprint] = useState("")
  const [error, setError] = useState("")
  const candidates = useMemo(() => findRecurringExpenses({
    transactions,
    bills,
    dismissedFingerprints: [...dismissedFingerprints, ...localDismissals],
    now,
  }), [transactions, bills, dismissedFingerprints, localDismissals, now])

  if (candidates.length === 0) return null

  const dismiss = async (candidate) => {
    setBusyFingerprint(candidate.fingerprint)
    setError("")
    try {
      await onDismiss?.(candidate.fingerprint)
      setLocalDismissals(current => [...current, candidate.fingerprint])
    } catch {
      setError("Pola ini belum bisa disembunyikan. Coba lagi.")
    } finally {
      setBusyFingerprint("")
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50/70 p-4 shadow-warm" aria-labelledby="recurring-expense-radar-title">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
          <Radar size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Radar pola</p>
          <h3 id="recurring-expense-radar-title" className="mt-1 text-base font-display font-bold text-md3-on-surface">Pola pengeluaran rutin</h3>
          <p className="mt-1 text-xs leading-relaxed text-md3-on-surface-variant">Beberapa pengeluaran terlihat berulang. Jadikan tagihan agar lebih mudah disiapkan.</p>
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700" role="alert">{error}</p>}

      <div className="mt-4 space-y-2">
        {candidates.map(candidate => (
          <article key={candidate.fingerprint} className="rounded-2xl border border-violet-100 bg-white/85 p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-md3-on-surface">{candidate.description}</p>
                <p className="mt-0.5 text-[11px] text-md3-on-surface-variant">
                  {candidate.category}{candidate.account ? ` · ${candidate.account}` : ""}
                </p>
              </div>
              <p className="flex-shrink-0 text-sm font-bold text-violet-700">{formatRpFull(candidate.medianAmount)}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-md3-on-surface-variant">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" /> Sekitar tanggal {Math.round(candidate.typicalDay)}</span>
              <span>Terlihat {candidate.monthCount} bulan</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAdd?.(candidate)}
                aria-label={`Jadikan tagihan ${candidate.description}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
              >
                <Plus size={13} aria-hidden="true" /> Jadikan tagihan
              </button>
              <button
                type="button"
                onClick={() => dismiss(candidate)}
                disabled={busyFingerprint === candidate.fingerprint}
                aria-label={`Sembunyikan ${candidate.description}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold text-md3-on-surface-variant transition-colors hover:bg-white hover:text-md3-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <X size={13} aria-hidden="true" /> {busyFingerprint === candidate.fingerprint ? "Menyimpan..." : "Sembunyikan"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
