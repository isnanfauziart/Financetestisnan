import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { readCache, writeCache, invalidateCache, clearCache, getLastSyncAgo, shouldAutoRefreshOnVisible, AUTO_REFRESH_VISIBLE_THRESHOLD_MS } from "@/app/dashboard/_components/useDashboardCache"

const KEY = "isnan.dashboard.cache.v3"
const USER_A = "ayu@example.com"
const USER_B = "budi@example.com"

describe("useDashboardCache", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })
  afterEach(() => {
    localStorage.clear()
  })

  describe("readCache", () => {
    it("returns null when no cache exists", () => {
      expect(readCache(USER_A)).toBeNull()
    })

    it("returns null for malformed JSON", () => {
      localStorage.setItem(`${KEY}:${encodeURIComponent(USER_A)}`, "{not json")
      expect(readCache(USER_A)).toBeNull()
    })

    it("only returns data for the authenticated cache owner", () => {
      const payload = { data: { totalIncome: 100 }, cachedAt: "2025-06-16T00:00:00.000Z" }
      writeCache(payload.data, USER_A)
      expect(readCache()).toBeNull()
      expect(readCache(USER_B)).toBeNull()
      expect(readCache(USER_A)?.data).toEqual(payload.data)
      expect(readCache(USER_A)?.cachedAt).toEqual(expect.any(String))
    })
  })

  describe("writeCache", () => {
    it("writes data with a fresh cachedAt timestamp", () => {
      const fixed = new Date("2025-06-16T12:34:56.000Z")
      vi.useFakeTimers()
      vi.setSystemTime(fixed)
      writeCache({ totalIncome: 200 }, USER_A)
      const stored = JSON.parse(localStorage.getItem(`${KEY}:${encodeURIComponent(USER_A)}`))
      expect(stored.data).toEqual({ totalIncome: 200 })
      expect(stored.cachedAt).toBe(fixed.toISOString())
      vi.useRealTimers()
    })
  })

  describe("invalidateCache", () => {
    it("removes the cache entry", () => {
      writeCache({}, USER_A)
      invalidateCache(USER_A)
      expect(readCache(USER_A)).toBeNull()
    })

    it("is a no-op when no cache exists", () => {
      expect(() => invalidateCache()).not.toThrow()
    })
  })

  describe("getLastSyncAgo", () => {
    it("returns null when cachedAt is missing", () => {
      expect(getLastSyncAgo(null)).toBeNull()
      expect(getLastSyncAgo("")).toBeNull()
      expect(getLastSyncAgo(undefined)).toBeNull()
    })

    it("returns 'baru saja' for < 1 minute", () => {
      const now = new Date("2025-06-16T12:00:30.000Z")
      const before = new Date("2025-06-16T12:00:00.000Z")
      expect(getLastSyncAgo(before.toISOString(), now.getTime())).toBe("baru saja")
    })

    it("returns minutes for < 1 hour", () => {
      const now = new Date("2025-06-16T12:30:00.000Z")
      const before = new Date("2025-06-16T12:25:00.000Z")
      expect(getLastSyncAgo(before.toISOString(), now.getTime())).toBe("5m lalu")
    })

    it("returns hours for < 1 day", () => {
      const now = new Date("2025-06-16T15:00:00.000Z")
      const before = new Date("2025-06-16T13:00:00.000Z")
      expect(getLastSyncAgo(before.toISOString(), now.getTime())).toBe("2j lalu")
    })

    it("returns days for >= 1 day", () => {
      const now = new Date("2025-06-18T12:00:00.000Z")
      const before = new Date("2025-06-16T12:00:00.000Z")
      expect(getLastSyncAgo(before.toISOString(), now.getTime())).toBe("2h lalu")
    })

    it("returns null for invalid date string", () => {
      expect(getLastSyncAgo("not a date")).toBeNull()
    })
  })

  describe("clearCache", () => {
    it("removes only the owner-scoped cache entry", () => {
      writeCache({ totalIncome: 100 }, USER_A)
      writeCache({ totalIncome: 200 }, USER_B)
      clearCache(USER_A)
      expect(readCache(USER_A)).toBeNull()
      expect(readCache(USER_B)?.data).toEqual({ totalIncome: 200 })
    })

    it("does not touch unrelated keys or preference storage", () => {
      localStorage.setItem("artami.prefs.theme", "dark")
      writeCache({}, USER_A)
      clearCache(USER_A)
      expect(localStorage.getItem("artami.prefs.theme")).toBe("dark")
    })

    it("is a no-op without an owner or storage", () => {
      expect(() => clearCache()).not.toThrow()
    })
  })

  describe("shouldAutoRefreshOnVisible", () => {
    it("refreshes when the last sync is older than the approved threshold", () => {
      const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString()
      expect(shouldAutoRefreshOnVisible({ lastSyncAt: sixMinutesAgo, refreshing: false, isOnline: true })).toBe(true)
    })

    it("holds at the boundary: just under 5 minutes does not refresh", () => {
      const justUnder = new Date(Date.now() - (AUTO_REFRESH_VISIBLE_THRESHOLD_MS - 1000)).toISOString()
      expect(shouldAutoRefreshOnVisible({ lastSyncAt: justUnder, refreshing: false, isOnline: true })).toBe(false)
    })

    it("does not refresh while a refresh is already running", () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      expect(shouldAutoRefreshOnVisible({ lastSyncAt: tenMinutesAgo, refreshing: true, isOnline: true })).toBe(false)
    })

    it("does not refresh while offline", () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      expect(shouldAutoRefreshOnVisible({ lastSyncAt: tenMinutesAgo, refreshing: false, isOnline: false })).toBe(false)
    })

    it("treats a missing or unreadable last sync as stale and refreshes", () => {
      expect(shouldAutoRefreshOnVisible({ lastSyncAt: null, refreshing: false, isOnline: true })).toBe(true)
      expect(shouldAutoRefreshOnVisible({ lastSyncAt: "not a date", refreshing: false, isOnline: true })).toBe(true)
    })
  })
})
