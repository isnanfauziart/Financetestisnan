"use client"
import { useEffect, useRef } from "react"
import { CheckCircle2 } from "lucide-react"

export default function GoalCelebration({ goal, onDone }) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    if (typeof window === "undefined") return

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([50, 30, 50]) } catch {}
    }

    let cancelled = false
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return
      const duration = 1500
      const end = Date.now() + duration
      const colors = [goal.color || "#5b8c7a", "#d4a853", "#9f87ef", "#7c8c5a"]
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors,
          zIndex: 9999,
        })
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors,
          zIndex: 9999,
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
        colors,
        zIndex: 9999,
      })
    }).catch(() => {})

    const t = setTimeout(() => onDone && onDone(), 4000)
    return () => { cancelled = true; clearTimeout(t) }
  }, [goal, onDone])

  return (
    <div
      className="fixed top-20 left-1/2 z-[60] px-5 py-3 rounded-2xl shadow-pop-lg text-sm font-bold text-white flex items-center gap-3 animate-slide-down pointer-events-none"
      style={{
        transform: "translateX(-50%)",
        background: `linear-gradient(135deg, ${goal.color || "#5b8c7a"}, #d4a853)`,
      }}
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 size={18} strokeWidth={3} aria-hidden="true" />
      Goal tercapai — {goal.nama} 🎉
    </div>
  )
}
