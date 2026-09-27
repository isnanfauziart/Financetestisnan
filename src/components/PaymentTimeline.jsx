"use client"

/**
 * Wave 9 — compact payment progress timeline.
 *
 * Four stages from the approved roadmap: Menunggu pembayaran → Bukti diterima
 * → Sedang ditinjau → Disetujui/Ditolak. The mapping is driven ONLY by the
 * stored payment status ("Disetujui" is never shown unless the record says
 * approved); no local clocks, no optimistic promotion.
 *
 * Status → steps:
 * - awaiting_payment → step 1 current (QR not paid yet)
 * - pending          → steps 1–2 done, step 3 current (proof received, in review)
 * - approved         → all done, final step reads Disetujui
 * - rejected         → steps 1–2 done, final step reads Ditolak (rejected)
 * - anything else (revoked/cancelled/expired/unknown) → fail-closed: only
 *   step 1 is current, nothing ahead is claimed as done.
 */

const BASE_STEPS = [
  { index: 1, key: "awaiting", label: "Menunggu pembayaran" },
  { index: 2, key: "received", label: "Bukti diterima" },
  { index: 3, key: "review", label: "Sedang ditinjau" },
  { index: 4, key: "final", label: "Disetujui" },
]

export function getTimelineSteps(status) {
  const normalized = String(status || "").trim()
  const approved = normalized === "approved"
  const rejected = normalized === "rejected"

  let currentIndex = 1
  if (approved || rejected) currentIndex = 4
  else if (normalized === "pending") currentIndex = 3

  return BASE_STEPS.map((step) => {
    const isFinalRejected = step.key === "final" && rejected
    let state = "upcoming"
    if (step.index < currentIndex) state = "done"
    else if (step.index === currentIndex) state = isFinalRejected ? "rejected" : "current"

    return {
      ...step,
      label: isFinalRejected ? "Ditolak" : step.label,
      state,
    }
  })
}

const STEP_STYLES = {
  done: {
    dot: "bg-moss-600 text-white",
    label: "text-md3-on-surface",
  },
  current: {
    dot: "bg-amber-500 text-white",
    label: "text-md3-on-surface font-bold",
  },
  rejected: {
    dot: "bg-rose-500 text-white",
    label: "text-md3-on-surface font-bold",
  },
  upcoming: {
    dot: "bg-md3-surface-container-high text-md3-on-surface-variant",
    label: "text-md3-on-surface-variant",
  },
}

export default function PaymentTimeline({ status }) {
  const steps = getTimelineSteps(status)
  const current = steps.find((step) => step.state === "current" || step.state === "rejected")

  return (
    <div>
      <ol aria-label="Status pembayaran" className="space-y-2.5">
        {steps.map((step) => {
          const style = STEP_STYLES[step.state] || STEP_STYLES.upcoming
          return (
            <li
              key={step.key}
              aria-current={step.state === "current" ? "step" : undefined}
              className="flex items-center gap-3"
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${style.dot}`}
              >
                {step.state === "done" ? "✓" : step.index}
              </span>
              <span className={`text-xs ${style.label}`}>{step.label}</span>
            </li>
          )
        })}
      </ol>
      {current && (
        <p className="sr-only" role="status">
          Langkah {current.index} dari 4: {current.label}
        </p>
      )}
    </div>
  )
}
