"use client"
import { formatRp } from "./helpers"

export default function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-strong rounded-2xl p-3 text-xs">
        <p className="font-semibold text-earth-800 mb-1.5">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: <span className="font-bold">{formatRp(p.value)}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}
