"use client"
import { useEffect, useRef, useState } from "react"

/**
 * Wave 7 — Statistik progressive disclosure.
 * Roadmap: "Show 'Geser untuk melihat semua bulan' only when chart content
 * actually overflows." Returns [ref, overflows]; attach the ref to the
 * horizontally scrollable viewport and render the hint only when `overflows`
 * is true. Re-measured after every render (data changes) and whenever the
 * container's box resizes (viewport changes) through one ResizeObserver.
 */
export default function useOverflowHint() {
  const ref = useRef(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    setOverflows(element.scrollWidth > element.clientWidth)
  })

  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(() => {
      setOverflows(element.scrollWidth > element.clientWidth)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, overflows]
}
