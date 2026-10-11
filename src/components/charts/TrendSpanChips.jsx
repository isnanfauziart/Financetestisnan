"use client"

import { TREND_SPAN_OPTIONS } from "@/lib/trendWindow"

/**
 * Compact per-card range chip (6 bln / 12 bln / Semua) for the Tren cards.
 * Each card owns its window independently — unlike the old section-level
 * filter, changing one card never changes another.
 */
export default function TrendSpanChips({ value, onChange, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-md3-outline-variant bg-md3-surface p-0.5"
    >
      {TREND_SPAN_OPTIONS.map((option) => {
        const selected = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
              selected
                ? "bg-md3-secondary-container text-md3-on-secondary-container"
                : "text-md3-on-surface-variant hover:bg-md3-surface-container-high"
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
