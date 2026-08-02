const KEY_PREFIX = "isnan.dashboard.cache.v3"

function normalizeOwner(owner) {
  if (typeof owner !== "string") return null
  const normalized = owner.trim().toLowerCase()
  return normalized || null
}

function getKey(owner) {
  const normalized = normalizeOwner(owner)
  return normalized ? `${KEY_PREFIX}:${encodeURIComponent(normalized)}` : null
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export function readCache(owner) {
  const key = getKey(owner)
  if (!isBrowser() || !key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeCache(data, owner) {
  const key = getKey(owner)
  if (!isBrowser() || !key) return
  try {
    localStorage.setItem(key, JSON.stringify({ data, cachedAt: new Date().toISOString() }))
  } catch {}
}

export function invalidateCache(owner) {
  const key = getKey(owner)
  if (!isBrowser() || !key) return
  try {
    localStorage.removeItem(key)
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
