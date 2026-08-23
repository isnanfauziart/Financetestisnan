"use client"
import { useEffect, useRef } from "react"
import { Check, X } from "lucide-react"

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
  align = "center",
  duration = 5000,
  action,
  noPointerEvents = false,
  children,
}) {
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!open || duration <= 0) return
    cancelledRef.current = false
    const timeoutId = setTimeout(() => {
      cancelledRef.current = true
      onDone?.()
    }, duration)
    return () => {
      cancelledRef.current = true
      clearTimeout(timeoutId)
    }
  }, [open, duration, onDone])

  if (!open) return null

  const Icon = variant === "celebration" ? null : VARIANT_ICON[variant]
  const positionClass = POSITION_CLASS[position] || POSITION_CLASS.top
  const alignClass = align === "right" ? "right-6" : align === "left" ? "left-6" : "left-1/2"

  return (
    <div
      className={`fixed ${alignClass} z-[60] ${positionClass} animate-slide-down ${noPointerEvents ? "pointer-events-none" : ""}`}
      style={align === "center" ? { transform: "translateX(-50%)" } : undefined}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-2xl shadow-pop-lg bg-earth-900 text-earth-50 text-sm font-medium pl-5 pr-3 py-1.5 min-w-[200px] max-w-md">
        {Icon && <Icon size={16} strokeWidth={2.5} className="flex-shrink-0 opacity-90" aria-hidden="true" />}
        <div className="flex-1 min-w-0">{children}</div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="ml-1 flex-shrink-0 min-h-[44px] px-3 rounded-full text-sm font-bold text-violet-300 hover:text-violet-200 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
