"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function QuotaNotice({ error }) {
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => { setDismissed(false) }, [error])
  if (!error || dismissed) return null
  const message = typeof error === "string" ? error : error.error
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-md3-surface-container-high px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold leading-relaxed text-md3-on-surface">{message}</p>
      <div className="flex items-center gap-1 flex-shrink-0">
        {error?.code === "FEATURE_LIMIT_REACHED" && (
          <Link href="/upgrade" className="btn-filled min-h-[40px] px-4 py-2 text-xs">
            Upgrade ke Pro
          </Link>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-[40px] rounded-full px-4 text-xs font-bold text-md3-on-surface-variant hover:bg-md3-surface-container-highest transition-colors"
        >
          Nanti
        </button>
      </div>
    </div>
  )
}
