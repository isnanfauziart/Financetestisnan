import { describe, expect, it } from "vitest"

describe("effective feature access", () => {
  it("uses server-resolved access when available, including admin OFF overrides", async () => {
    const { hasFeature } = await import("@/lib/featureAccess")
    expect(hasFeature({ isAdmin: true, featureAccess: { healthScore: false }, features: { healthScore: true } }, "healthScore")).toBe(false)
    expect(hasFeature({ featureAccess: { budgets: true } }, "budgets")).toBe(true)
  })

  it("keeps backward-compatible tier behavior when effective access is absent", async () => {
    const { hasFeature } = await import("@/lib/featureAccess")
    expect(hasFeature({ features: { healthScore: true } }, "healthScore")).toBe(true)
    expect(hasFeature({ features: { healthScore: false }, isAdmin: true }, "healthScore")).toBe(true)
    expect(hasFeature({}, "budgets")).toBe(true)
  })

  it("fails closed while entitlement is unresolved or unverifiable", async () => {
    const { hasFeature } = await import("@/lib/featureAccess")

    expect(hasFeature(null, "healthScore")).toBe(false)
    expect(hasFeature({ entitlementVerified: false, features: { healthScore: true } }, "healthScore")).toBe(false)
  })
})
