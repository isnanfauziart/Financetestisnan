"use client"
import Link from "next/link"
import { Lock, Sparkles } from "lucide-react"

export default function LockedFeaturePreview({ title, description, href = "/upgrade", unavailable = false }) {
  if (unavailable) {
    return (
      <section className="bento-tile bg-earth-50 border border-earth-100 p-5" aria-label={`${title} tidak tersedia`}>
        <h3 className="text-sm font-bold text-earth-800">{title}</h3>
        <p className="mt-1 text-xs text-earth-500">{description || "Fitur sedang tidak tersedia."}</p>
      </section>
    )
  }

  return (
    <section className="bento-tile bg-earth-50 border border-earth-100 p-5" aria-label={`${title} terkunci`}>
      <div className="rounded-2xl bg-white/70 border border-earth-100 p-4" aria-hidden="true">
        <div className="grid grid-cols-6 gap-2 items-end h-20 opacity-35 blur-[2px]">
          {[32, 52, 38, 68, 46, 60].map((height, index) => <div key={index} className="rounded-t-lg bg-violet-400" style={{ height: `${height}%` }} />)}
        </div>
      </div>
      <div className="flex items-start gap-3 mt-4">
        <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0"><Lock size={16} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-earth-800">{title}</h3><p className="text-xs text-earth-500 mt-1">{description}</p></div>
      </div>
      <Link href={href} aria-label={`Buka Pro untuk ${title}`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700"><Sparkles size={13} aria-hidden="true" /> Buka Pro</Link>
    </section>
  )
}
