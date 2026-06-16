import { useEffect, useState } from "react"
import { MONTHS_MAP } from "./constants"

export function formatRp(amount) {
  if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)} jt`
  if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)} rb`
  return `Rp ${amount}`
}

export function formatRpFull(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)
}

export function formatInputRupiah(val) {
  const num = val.replace(/[^0-9]/g, "")
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function parseTxDate(dateStr) {
  if (!dateStr) return 0
  const m = String(dateStr).match(/^(\d+)\s+(\w+)\s+(\d+)/)
  if (!m) return 0
  return new Date(+m[3], MONTHS_MAP[m[2]] ?? 0, +m[1]).getTime()
}

export function formatShortDate(dateStr) {
  const m = String(dateStr || "").match(/^(\d+)\s+(\w+)/)
  return m ? `${m[1]} ${m[2]}` : dateStr || ""
}

export function useCountUp(target, duration = 1000) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target || target === 0) { setValue(0); return }
    let startTime = null
    const animate = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])
  return value
}

export function useCountUpOvershoot(target, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target || target === 0) { setValue(0); return }
    let startTime = null
    const animate = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const overshoot = 1.08 - 0.08 * eased
      setValue(Math.round(target * eased * overshoot))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration])
  return value
}

export function useSoundPref() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true
    const stored = localStorage.getItem("soundEnabled")
    return stored === null ? true : stored === "true"
  })
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("soundEnabled", String(enabled))
    }
  }, [enabled])
  return [enabled, setEnabled]
}

let audioCtx = null
function getCtx() {
  if (typeof window === "undefined") return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  if (audioCtx.state === "suspended") audioCtx.resume()
  return audioCtx
}

export function playSuccessSound() {
  const ctx = getCtx()
  if (!ctx) return
  const t0 = ctx.currentTime
  const playTone = (freq, startOffset, dur) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, t0 + startOffset)
    gain.gain.setValueAtTime(0, t0 + startOffset)
    gain.gain.linearRampToValueAtTime(0.18, t0 + startOffset + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + startOffset + dur)
    osc.start(t0 + startOffset)
    osc.stop(t0 + startOffset + dur)
  }
  playTone(880, 0, 0.18)
  playTone(1320, 0.07, 0.25)
}
