"use client"
import { useCountUp } from "@/app/dashboard/_components/helpers"

export default function GoalProgressRing({ progress, color = "#5b8c7a", size = 88, stroke = 8, completed = false }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const safeProgress = Math.min(Math.max(progress || 0, 0), 100)
  const offset = circumference * (1 - safeProgress / 100)
  const animatedPct = useCountUp(Math.round(safeProgress), 1100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Progress ${Math.round(safeProgress)} percent`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#ede0d0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={completed ? "#d4a853" : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-display font-bold leading-none" style={{ color: completed ? "#d4a853" : color }}>
          {animatedPct}
          <span className="text-[10px] opacity-70">%</span>
        </span>
      </div>
    </div>
  )
}
