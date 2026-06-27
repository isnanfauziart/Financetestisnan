"use client"
import { useEffect, useRef } from "react"
import { CheckCircle2 } from "lucide-react"
import { EVENT_COLORS } from "@/app/dashboard/_components/constants"
import Toast from "@/app/dashboard/_components/Toast"

export default function EventCelebration({ event, haptics, hapticsEnabled, onDone }) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    if (typeof window === "undefined") return

    if (hapticsEnabled) haptics.success()

    const eventColor = event.tipe === "anak-sekolah" ? EVENT_COLORS["anak-sekolah"] : event.tipe === "lebaran-thr" ? EVENT_COLORS["lebaran-thr"] : EVENT_COLORS.custom

    let cancelled = false
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return
      const duration = 1500
      const end = Date.now() + duration
      const colors = [eventColor, "#d4a853", "#9f87ef", "#7c8c5a"]
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
  }, [event])

  return (
    <Toast
      open={true}
      onDone={onDone}
      variant="celebration"
      position="top-high"
      duration={4000}
      noPointerEvents
      celebrationColor={event.tipe === "anak-sekolah" ? EVENT_COLORS["anak-sekolah"] : event.tipe === "lebaran-thr" ? EVENT_COLORS["lebaran-thr"] : EVENT_COLORS.custom}
    >
      <CheckCircle2 size={18} strokeWidth={3} aria-hidden="true" />
      <span>Event budget tercapai — {event.nama} 🎉</span>
    </Toast>
  )
}
