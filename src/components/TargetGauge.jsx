"use client"

import { formatRp } from "@/app/dashboard/_components/helpers"

const TARGET_SPECTRUM = "linear-gradient(90deg, #6f8ca0 0%, #5d9290 58%, #4f9c84 80%, #4c735a 100%)"

export default function TargetGauge({ progress = 0, target = 0, featured = false, label = "Progress target" }) {
  const safeTarget = Math.max(Number(target) || 0, 1)
  const safeProgress = Math.max(Number(progress) || 0, 0)
  const percentage = Math.min(100, (safeProgress / safeTarget) * 100)
  const roundedPercentage = Math.round(percentage)
  const markerPosition = Math.min(100, Math.max(0, percentage))

  return (
    <div className={`plan-gauge ${featured ? "plan-gauge--featured" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="plan-kicker">{label}</span>
        <strong className="plan-gauge__percentage tabular-nums">{roundedPercentage}%</strong>
      </div>
      <div
        className="plan-gauge__track"
        role="progressbar"
        aria-valuenow={roundedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${formatRp(safeProgress)} dari ${formatRp(target)} · ${roundedPercentage}% tercapai`}
        aria-label={`${label} ${roundedPercentage}%`}
      >
        <div
          className="plan-gauge__fill"
          style={{ width: `${percentage}%`, background: TARGET_SPECTRUM }}
        />
        <span
          className={`plan-gauge__marker ${percentage === 0 ? "plan-gauge__marker--start" : percentage === 100 ? "plan-gauge__marker--end" : ""}`}
          aria-hidden="true"
          style={{ left: `${markerPosition}%` }}
        />
      </div>
      <div className="plan-gauge__scale tabular-nums" aria-hidden="true">
        <span>Rp 0</span>
        <span>{formatRp(target)}</span>
      </div>
    </div>
  )
}
