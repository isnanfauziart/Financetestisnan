"use client"
import { Eye, EyeOff } from "lucide-react"

/**
 * Shared privacy-eye toggle for headline money values.
 *
 * One instance per covered section, all wired to the same shared state, so
 * tapping any eye shows/hides every covered amount at once. Minimum 44px hit
 * target and `aria-pressed` keep it accessible on the hero's dark surface and
 * on light cards alike via the `tone` prop.
 */
export default function EyeToggle({ hidden, onToggle, tone = "light", size = "sm" }) {
  const label = hidden ? "Tampilkan angka" : "Sembunyikan angka"
  const toneClasses = tone === "dark"
    ? "bg-white/15 text-white/90 hover:bg-white/25"
    : "bg-md3-surface text-md3-on-surface-variant hover:bg-md3-surface-container-high hover:text-violet-600"
  const dimension = size === "lg" ? "h-11 w-11" : "h-8 w-8"

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      aria-label={label}
      title={label}
      data-testid="privacy-eye-toggle"
      // The compact visual (32px) stays inline with small hero text; the
      // invisible pseudo-element extends the hit area to the 44px touch target.
      className={`relative inline-flex ${dimension} flex-shrink-0 items-center justify-center rounded-full transition-colors after:absolute after:-inset-1.5 after:content-[''] ${toneClasses}`}
    >
      {hidden ? <EyeOff size={15} strokeWidth={2.2} aria-hidden="true" /> : <Eye size={15} strokeWidth={2.2} aria-hidden="true" />}
    </button>
  )
}
