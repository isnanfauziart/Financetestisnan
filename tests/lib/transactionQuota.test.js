import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/usage", () => ({
  getCurrentMonthPeriod: vi.fn(() => "2026-07"),
  getNextMonthlyResetAt: vi.fn(() => "2026-08-01T00:00:00+07:00"),
  reserveUsage: vi.fn(),
  releaseUsage: vi.fn(),
}))

describe("transaction quota", () => {
  beforeEach(() => vi.clearAllMocks())

  it("bypasses Supabase for effective Pro accounts", async () => {
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    const { reserveUsage } = await import("@/lib/usage")
    expect(await reserveTransaction({ tier: "paid" })).toBeNull()
    expect(reserveUsage).not.toHaveBeenCalled()
  })

  it("fails closed when Free entitlement cannot be verified", async () => {
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    await expect(reserveTransaction({ tier: "free", entitlementVerified: false, user: { id: "u" } }))
      .rejects.toMatchObject({ code: "ENTITLEMENT_UNAVAILABLE" })
  })

  it("maps the atomic database limit rejection to a feature-limit error", async () => {
    const { reserveUsage } = await import("@/lib/usage")
    reserveUsage.mockRejectedValue(new Error("feature_limit_exceeded"))
    const { reserveTransaction } = await import("@/lib/transactionQuota")
    await expect(reserveTransaction({ tier: "free", entitlementVerified: true, user: { id: "u" } }))
      .rejects.toMatchObject({ code: "FEATURE_LIMIT_REACHED", current: 75 })
  })

  it("returns the documented 403 and retryable 503 contracts", async () => {
    const { QuotaError, quotaErrorResponse } = await import("@/lib/transactionQuota")
    const limited = quotaErrorResponse(new QuotaError("FEATURE_LIMIT_REACHED", 75))
    expect(limited.status).toBe(403)
    await expect(limited.json()).resolves.toMatchObject({
      code: "FEATURE_LIMIT_REACHED", feature: "transactions", current: 75, limit: 75, upgrade: true,
    })
    const unavailable = quotaErrorResponse(new QuotaError("ENTITLEMENT_UNAVAILABLE"))
    expect(unavailable.status).toBe(503)
    await expect(unavailable.json()).resolves.toMatchObject({
      code: "ENTITLEMENT_UNAVAILABLE", retryable: true,
    })
  })
})
