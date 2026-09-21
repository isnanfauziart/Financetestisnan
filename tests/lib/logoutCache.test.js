import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { readCache, writeCache, clearCache } from "@/app/dashboard/_components/useDashboardCache"
import { getWriteState, markStale, markSynced, resetWriteState } from "@/lib/financialWriteState"

describe("logout clears the financial cache and write state", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    resetWriteState()
  })

  it("clearCache removes only the owner-scoped entry (handleSignOut contract)", () => {
    writeCache({ transactions: [] }, "ayu@example.com")
    writeCache({ transactions: [] }, "budi@example.com")

    clearCache("ayu@example.com")

    expect(readCache("ayu@example.com")).toBeNull()
    expect(readCache("budi@example.com")).not.toBeNull()
  })

  it("resetWriteState clears the write gate and the last-synced stamp", () => {
    markSynced("2026-09-19T08:00:00.000Z")
    markStale("network down")
    expect(getWriteState().reason).toBe("stale")

    resetWriteState()

    expect(getWriteState()).toEqual({ reason: null, detail: "", lastSyncedAt: "" })
  })

  it("preference storage survives cache clearing", () => {
    localStorage.setItem("artami.prefs.theme", "dark")
    writeCache({}, "ayu@example.com")

    clearCache("ayu@example.com")

    expect(localStorage.getItem("artami.prefs.theme")).toBe("dark")
  })
})
