"use client"
import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"

const VARIANT_BG = {
  info: "linear-gradient(135deg, #7c5fcf, #9f87ef)",
  success: "linear-gradient(135deg, #5b8c7a, #7aab9a)",
  error: "#c44545",
}

const VARIANT_ICON = {
  info: Check,
  success: Check,
  error: X,
}

const POSITION_CLASS = {
  top: "top-6",
  "top-high": "top-20",
  bottom: "bottom-24",
}

export default function Toast({
  open,
  onDone,
  variant = "info",
  position = "top",
  duration = 5000,
  action,
  noPointerEvents = false,
  celebrationColor,
  children,
}) {
  const [progress, setProgress] = useState(100)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!open) return
    cancelledRef.current = false
    setProgress(100)

    let rafId
    let timeoutId
    if (duration > 0) {
      const start = performance.now()
      const tick = (t) => {
        if (cancelledRef.current) return
        const pct = 100 - ((t - start) / duration) * 100
        if (pct <= 0) {
          setProgress(0)
          return
        }
        setProgress(pct)
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
      timeoutId = setTimeout(() => {
        cancelledRef.current = true
        onDone?.()
      }, duration)
    }

    return () => {
      cancelledRef.current = true
      if (rafId) cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [open, duration, onDone])

  if (!open) return null

  const variantBg =
    variant === "celebration"
      ? `linear-gradient(135deg, ${celebrationColor || "#5b8c7a"}, #d4a853)`
      : VARIANT_BG[variant] || VARIANT_BG.info
  const Icon = variant === "celebration" ? null : VARIANT_ICON[variant]
  const positionClass = POSITION_CLASS[position] || POSITION_CLASS.top

  return (
    <div
      className={`fixed left-1/2 z-[60] ${positionClass} animate-slide-down ${noPointerEvents ? "pointer-events-none" : ""}`}
      style={{ transform: "translateX(-50%)" }}
      role="status"
      aria-live="polite"
    >
      <div
        className="relative rounded-2xl shadow-pop-lg text-sm font-semibold text-white px-6 py-3 min-w-[200px] max-w-md flex items-center gap-3"
        style={{ background: variantBg }}
      >
        {Icon && <Icon size={16} strokeWidth={3} aria-hidden="true" />}
        <div className="flex-1 min-w-0">{children}</div>
        {action && (
          <button
            onClick={action.onClick}
            className="ml-2 px-2 py-1 rounded-lg bg-white/20 text-xs font-bold hover:bg-white/30 transition-colors"
          >
            {action.label}
          </button>
        )}
        {duration > 0 && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-white/50 rounded-b-2xl"
            style={{ width: `${progress}%`, transition: "none" }}
          />
        )}
      </div>
    </div>
  )
}
