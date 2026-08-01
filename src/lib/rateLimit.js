const DEFAULT_LIMIT = 60
const DEFAULT_WINDOW_MS = 60_000

export function createRateLimiter({ limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS, now = () => Date.now() } = {}) {
  const buckets = new Map()

  function check(key) {
    const bucketKey = String(key || "anonymous")
    const current = now()
    const previous = buckets.get(bucketKey)

    if (!previous || current - previous.startedAt >= windowMs) {
      buckets.set(bucketKey, { startedAt: current, count: 1 })
      return { allowed: true, limit, remaining: Math.max(limit - 1, 0), retryAfterSeconds: 0 }
    }

    if (previous.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((previous.startedAt + windowMs - current) / 1000)),
      }
    }

    previous.count += 1
    return { allowed: true, limit, remaining: Math.max(limit - previous.count, 0), retryAfterSeconds: 0 }
  }

  return {
    check,
    clear: () => buckets.clear(),
  }
}

export const apiRateLimiter = createRateLimiter()
