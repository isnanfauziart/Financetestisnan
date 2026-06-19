"use client"
import { useEffect, useRef } from "react"
import { CheckCircle2 } from "lucide-react"
import Toast from "@/app/dashboard/_components/Toast"

export default function GoalCelebration({ goal, haptics, hapticsEnabled, onDone }) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    if (typeof window === "undefined") return

    if (hapticsEnabled) haptics.success()

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

    return () => {
      cancelled = true
    }
  }, [goal])

  return (
    <Toast
      open={true}
      onDone={onDone}
      variant="celebration"
      position="top-high"
      duration={4000}
      noPointerEvents
      celebrationColor={goal.color}
    >
      <CheckCircle2 size={18} strokeWidth={3} aria-hidden="true" />
      <span>Goal tercapai — {goal.nama} 🎉</span>
    </Toast>
  )
}
