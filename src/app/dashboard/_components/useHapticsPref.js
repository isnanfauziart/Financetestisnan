"use client"
import { useEffect, useState } from "react"

export default function useHapticsPref() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true
    const stored = localStorage.getItem("hapticsEnabled")
    return stored === null ? true : stored === "true"
  })
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hapticsEnabled", String(enabled))
    }
  }, [enabled])
  return [enabled, setEnabled]
}
