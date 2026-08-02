import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { readCache, writeCache, invalidateCache, getLastSyncAgo } from "@/app/dashboard/_components/useDashboardCache"

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
})
