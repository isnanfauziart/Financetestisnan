"use client"
import { useState } from "react"

/**
 * Wave 7 — Statistik progressive disclosure.
 * Roadmap: "Add keyboard-operable data lists or tables for cash flow,
 * category, trend, and comparison charts. Pointer chart interactions may
 * remain as shortcuts." Renders a real focusable table behind a labelled
 * disclosure so every chart conclusion is reachable without pointer-only
 * interaction. Returns null when there is no data to show.
 */
export default function StatsDataTable({ id, caption, columns, rows }) {
  const [open, setOpen] = useState(false)
  if (!Array.isArray(columns) || columns.length === 0 || !Array.isArray(rows) || rows.length === 0) return null

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(previous => !previous)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-md3-surface px-3 py-2 text-[11px] font-bold text-md3-on-surface-variant transition-colors hover:bg-md3-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
      >
        {open ? "Sembunyikan tabel data" : "Lihat data sebagai tabel"}
      </button>
      {open && (
        <div id={id} role="region" aria-label={caption} className="mt-2 overflow-x-auto animate-slide-down">
          <table className="w-full border-collapse text-left text-xs">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={`border-b border-md3-outline-variant px-2 py-2 font-bold text-md3-on-surface-variant ${index === 0 ? "" : "text-right"}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.label ?? rowIndex} className="border-b border-md3-outline-variant/50 last:border-b-0">
                  <th scope="row" className="px-2 py-2 text-left font-semibold text-md3-on-surface">{row.label}</th>
                  {row.values.map((value, valueIndex) => (
                    <td key={valueIndex} className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums text-md3-on-surface">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
