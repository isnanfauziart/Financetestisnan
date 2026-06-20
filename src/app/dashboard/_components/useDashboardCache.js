const KEY = "isnan.dashboard.cache.v2"

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export function readCache() {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeCache(data) {
  if (!isBrowser()) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ data, cachedAt: new Date().toISOString() }))
  } catch {}
}

export function invalidateCache() {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

export function getLastSyncAgo(cachedAt, now = Date.now()) {
  if (!cachedAt) return null
  const t = new Date(cachedAt).getTime()
  if (isNaN(t)) return null
  const diff = Math.max(0, now - t)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "baru saja"
  if (mins < 60) return `${mins}m lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}j lalu`
  return `${Math.floor(hours / 24)}h lalu`
}
