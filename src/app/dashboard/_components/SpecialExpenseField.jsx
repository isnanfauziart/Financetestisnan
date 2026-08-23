"use client"
import { X } from "lucide-react"

export const SPECIAL_HELPER_COPY = "Tetap masuk total dan saldo, tetapi tidak memengaruhi tren rutinitas."

export function parseRawAmount(rawAmount) {
  return Number(String(rawAmount || "").replace(/[^0-9]/g, "")) || 0
}

export function shouldShowSpecialSuggestion({ specialSuggestion, rawAmount, txType, sifat, dismissed }) {
  const threshold = Number(specialSuggestion?.threshold || 0)
  return txType === "expense"
    && sifat !== "Spesial"
    && !dismissed
    && threshold > 0
    && parseRawAmount(rawAmount) >= threshold
}

// Shared "Pengeluaran Spesial" field group: opt-in checkbox + optional
// baseline suggestion row. Used by QuickAddSheet (with suggestion) and
// EditTransactionModal (checkbox only).
export default function SpecialExpenseField({ checked, onChange, helperId, suggestion = null, onAcceptSuggestion, onDismissSuggestion }) {
  return (
    <div className="rounded-2xl border border-md3-outline-variant bg-md3-surface-container-low px-3.5 py-3 space-y-2">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          aria-label="Pengeluaran Spesial"
          aria-describedby={helperId}
          className="mt-0.5 h-4 w-4 rounded border-md3-outline text-violet-600 focus:ring-violet-300"
        />
        <span className="min-w-0">
          <span className="block text-xs font-bold text-md3-on-surface">Pengeluaran Spesial</span>
          <span id={helperId} className="mt-0.5 block text-[11px] leading-relaxed text-md3-on-surface-variant">
            {SPECIAL_HELPER_COPY}
          </span>
        </span>
      </label>
      {suggestion && (
        <div className="flex flex-col gap-2 rounded-xl bg-md3-surface-container-lowest px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-semibold leading-relaxed text-md3-on-surface-variant">
            Jumlah ini melewati baseline rutin {suggestion.baselineMonths || 3} bulan terakhir.
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onAcceptSuggestion}
              className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100"
            >
              Tandai Spesial
            </button>
            <button
              type="button"
              onClick={onDismissSuggestion}
              aria-label="Tutup saran Pengeluaran Spesial"
              className="flex h-7 w-7 items-center justify-center rounded-full text-earth-400 hover:bg-md3-surface-container-high hover:text-md3-on-surface-variant"
            >
              <X size={12} strokeWidth={3} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
