import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { readCache, writeCache, invalidateCache, getLastSyncAgo } from "@/app/dashboard/_components/useDashboardCache"

const KEY = "isnan.dashboard.cache.v1"

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
      expect(readCache()).toBeNull()
    })

    it("returns null for malformed JSON", () => {
      localStorage.setItem(KEY, "{not json")
      expect(readCache()).toBeNull()
    })

    it("returns the parsed cache object", () => {
      const payload = { data: { totalIncome: 100 }, cachedAt: "2025-06-16T00:00:00.000Z" }
      localStorage.setItem(KEY, JSON.stringify(payload))
      expect(readCache()).toEqual(payload)
    })
  })

  describe("writeCache", () => {
    it("writes data with a fresh cachedAt timestamp", () => {
      const fixed = new Date("2025-06-16T12:34:56.000Z")
      vi.useFakeTimers()
      vi.setSystemTime(fixed)
      writeCache({ totalIncome: 200 })
      const stored = JSON.parse(localStorage.getItem(KEY))
      expect(stored.data).toEqual({ totalIncome: 200 })
      expect(stored.cachedAt).toBe(fixed.toISOString())
      vi.useRealTimers()
    })
  })

  describe("invalidateCache", () => {
    it("removes the cache entry", () => {
      localStorage.setItem(KEY, JSON.stringify({ data: {}, cachedAt: "x" }))
      invalidateCache()
      expect(localStorage.getItem(KEY)).toBeNull()
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
})
