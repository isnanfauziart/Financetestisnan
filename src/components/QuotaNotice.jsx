"use client"
import Link from "next/link"

export default function QuotaNotice({ error }) {
  if (!error) return null
  const message = typeof error === "string" ? error : error.error
  return (
    <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
      <p>{message}</p>
      {error?.code === "FEATURE_LIMIT_REACHED" && (
        <Link href="/upgrade" className="mt-2 inline-block rounded-xl bg-violet-600 px-3 py-2 font-bold text-white">
          Upgrade ke Pro
        </Link>
      )}
    </div>
  )
}
