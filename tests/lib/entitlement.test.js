import { beforeEach, describe, expect, it, vi } from "vitest"

const fromMock = vi.fn()

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

function adminLookup(result) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const limit = vi.fn(() => ({ maybeSingle }))
  const ilike = vi.fn(() => ({ limit }))
  const select = vi.fn(() => ({ ilike }))
  fromMock.mockReturnValueOnce({ select })
  return { select, ilike, limit, maybeSingle }
}

describe("effective entitlement", () => {
  beforeEach(() => {
    vi.resetModules()
    fromMock.mockReset()
  })

  it("treats a normalized admin email as paid even when stored tier is free", async () => {
    const lookup = adminLookup({ data: { email: "admin@example.com" }, error: null })

    const { getEffectiveEntitlement } = await import("@/lib/entitlement")
    const result = await getEffectiveEntitlement({
      id: "user-1",
      email: " Admin@Example.com ",
      tier: "free",
    })

    expect(lookup.ilike).toHaveBeenCalledWith("email", "admin@example.com")
    expect(lookup.limit).toHaveBeenCalledWith(1)
    expect(result).toMatchObject({
      tier: "paid",
      storedTier: "free",
      isAdmin: true,
      entitlementVerified: true,
    })
  })

  it("preserves stored-free access as unverifiable free when admin lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    adminLookup({ data: null, error: { message: "timeout" } })

    const { getEffectiveEntitlement } = await import("@/lib/entitlement")
    const result = await getEffectiveEntitlement({
      id: "user-2",
      email: "user@example.com",
      tier: "free",
    })

    expect(result).toMatchObject({
      tier: "free",
      storedTier: "free",
      isAdmin: false,
      entitlementVerified: false,
    })
  })
})
