"use client"
import { Sparkles, AlertCircle, Info, TrendingUp } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"

/**
 * Shared insight card (revamp C) used by both Home ("Insights utama") and
 * Stats ("Insights"). Replaces the two divergent implementations and the
 * hex-concatenation inline styling (`ins.color + "12"`) with semantic tones.
 *
 * variant "tinted" (Stats): type label + tone-tinted background.
 * variant "neutral" (Home): quiet list card with an accent icon chip.
 */
const INSIGHT_TONES = {
  positive: { container: THEME.incomeBg, accent: THEME.income, label: "Positif" },
  warning: { container: THEME.warningBg, accent: THEME.warning, label: "Perhatian" },
  danger: { container: THEME.dangerBg, accent: THEME.danger, label: "Perhatian" },
  info: { container: THEME.smartBg, accent: THEME.smart, label: "Info" },
}

const TYPE_ICONS = { positive: TrendingUp, warning: AlertCircle, danger: AlertCircle, info: Info }

export default function InsightCard({ insight, variant = "tinted", style = undefined }) {
  const Icon = insight.icon || Sparkles
  const tone = INSIGHT_TONES[insight.type] || INSIGHT_TONES.info
  const accent = insight.color || tone.accent

  if (variant === "neutral") {
    return (
      <article className="rounded-2xl border border-md3-outline-variant bg-md3-surface-container-low p-3 shadow-warm" style={style}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-md3-surface-container-lowest" style={{ color: accent }}>
            <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
          </div>
          <p className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-md3-on-surface">{insight.text}</p>
        </div>
      </article>
    )
  }

  const TypeIcon = TYPE_ICONS[insight.type] || Info

  return (
    <div className="insight-card animate-fade-in-up" style={{ background: tone.container, ...style }}>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white/55 relative" style={{ color: accent }}>
        <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full" style={{ background: accent, color: "white" }}>
          <TypeIcon size={8} strokeWidth={3} aria-hidden="true" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{tone.label}</p>
        <p className="mt-0.5 text-xs font-semibold leading-snug text-md3-on-surface">{insight.text}</p>
      </div>
    </div>
  )
}
