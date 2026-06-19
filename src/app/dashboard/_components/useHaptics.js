"use client"

const PATTERNS = {
  tap: 10,
  select: 5,
  success: 50,
  warning: [100, 50, 100],
  error: [200, 100, 200, 100, 200],
}

function vibrate(pattern) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return
  try { navigator.vibrate(pattern) } catch {}
}

export default function useHaptics() {
  return {
    tap: () => vibrate(PATTERNS.tap),
    select: () => vibrate(PATTERNS.select),
    success: () => vibrate(PATTERNS.success),
    warning: () => vibrate(PATTERNS.warning),
    error: () => vibrate(PATTERNS.error),
  }
}
