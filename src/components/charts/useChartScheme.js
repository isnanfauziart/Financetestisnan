"use client"
import { useEffect, useState } from "react"
import { getChartSchemeIsDark } from "@/lib/chartTheme"

/**
 * Subscribes to the `data-theme` attribute on <html> (set by ProfileTab and
 * the inline bootstrap script) so charts re-render with the resolved dark
 * palette instead of staying light-only.
 */
export function useChartScheme() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const read = () => setIsDark(root.getAttribute("data-theme") === "dark")
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [])

  return isDark
}

export default useChartScheme
