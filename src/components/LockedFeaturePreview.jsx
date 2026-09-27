"use client"
import Link from "next/link"
import { Lock, Sparkles } from "lucide-react"

/**
 * Wave 8 — locked smart-feature preview contract.
 *
 * Three states, chosen by the caller via `getFeatureGate`:
 * - `unavailable` — admin flag off: plain "tidak tersedia" card, no CTA.
 * - `unresolved` — entitlement still loading: neutral "Memuat ringkasan…"
 *   placeholder with no CTA and no unavailable/Pro copy (never implies a
 *   state the server has not answered yet).
 * - default (locked) — compact static preview: one blurred non-personal
 *   illustration, optional static `example` line, exactly ONE upgrade action
 *   honoring `proRegistrationOpen`.
 *
 * Locked previews must never receive personal/user data — callers pass only
 * static copy (enforced by tests/components/previewPropsContract.test.jsx).
 */
export default function LockedFeaturePreview({ title, description, example, href = "/upgrade", unavailable = false, unresolved = false, proRegistrationOpen = true }) {
  if (unavailable) {
    return (
      <section className="bento-tile bg-md3-surface border border-md3-outline-variant p-5" aria-label={`${title} tidak tersedia`}>
        <h3 className="text-sm font-bold text-md3-on-surface">{title}</h3>
        <p className="mt-1 text-xs text-md3-on-surface-variant">{description || "Fitur sedang tidak tersedia."}</p>
      </section>
    )
  }

  if (unresolved) {
    return (
      <section
        className="bento-tile bg-md3-surface border border-md3-outline-variant p-5"
        role="status"
        aria-label={title}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-md3-surface-container-high flex items-center justify-center flex-shrink-0 animate-pulse" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-md3-on-surface">{title}</h3>
            <p className="mt-1 text-xs text-md3-on-surface-variant">Memuat ringkasan…</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bento-tile bg-md3-surface border border-md3-outline-variant p-5" aria-label={`${title} terkunci`}>
      <div className="rounded-2xl bg-md3-surface-container-highest border border-md3-outline-variant p-4" aria-hidden="true">
        <div className="grid grid-cols-6 gap-2 items-end h-20 opacity-35 blur-[2px]">
          {[32, 52, 38, 68, 46, 60].map((height, index) => <div key={index} className="rounded-t-lg bg-violet-400" style={{ height: `${height}%` }} />)}
        </div>
      </div>
      <div className="flex items-start gap-3 mt-4">
        <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0"><Lock size={16} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-md3-on-surface">{title}</h3><p className="text-xs text-md3-on-surface-variant mt-1">{description}</p></div>
      </div>
      {example && (
        <p className="mt-3 rounded-xl bg-md3-surface-container-low px-3 py-2 text-[11px] leading-relaxed text-md3-on-surface-variant">{example}</p>
      )}
      <Link href={href} aria-label={proRegistrationOpen === false ? "Pro sementara ditutup" : `Buka Pro untuk ${title}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"><Sparkles size={13} aria-hidden="true" /> {proRegistrationOpen === false ? "Pro sementara ditutup" : "Buka Pro"}</Link>
    </section>
  )
}
