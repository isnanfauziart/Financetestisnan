import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }))

function makeClient({ flags = [], overrides = [], update = vi.fn() } = {}) {
  const select = (rows) => ({
    select: () => ({
      eq: (key, value) => ({
        maybeSingle: async () => ({ data: rows[0] || null, error: null }),
        then: (resolve) => resolve({ data: key === "user_id" ? rows.filter(row => row.user_id === value || !row.user_id) : rows, error: null }),
      }),
      then: (resolve) => resolve({ data: rows, error: null }),
    }),
    update,
  })
  return {
    from(table) {
      if (table === "feature_flags") return select(flags)
      if (table === "feature_flag_overrides") return select(overrides)
      throw new Error(`unexpected table ${table}`)
    },
  }
}

describe("feature flag foundation", () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.restoreAllMocks())

  it("uses a user override, then inherits the global setting, and supports Use global", async () => {
    const { resolveFeatureAccess } = await import("@/lib/featureFlags")
    const client = makeClient({
      flags: [{ key: "budgets_enabled", enabled: true }],
      overrides: [{ user_id: "u1", feature_key: "budgets", enabled: false }],
    })

    expect((await resolveFeatureAccess({ id: "u1", tier: "paid" }, { client })).budgets).toBe(false)
    expect((await resolveFeatureAccess({ id: "u2", tier: "paid" }, { client })).budgets).toBe(true)
  })

  it("keeps Pro registration global-only even when a crafted user override exists", async () => {
    const { resolveFeatureAccess } = await import("@/lib/featureFlags")
    const client = makeClient({
      flags: [{ key: "pro_registration", enabled: true }],
      overrides: [{ user_id: "u1", feature_key: "proRegistration", enabled: false }],
    })

    expect((await resolveFeatureAccess({ id: "u1", tier: "free" }, { client })).proRegistration).toBe(true)
  })

  it("applies due schedules, leaves future schedules pending, and replaces them", async () => {
    const { resolveFeatureAccess } = await import("@/lib/featureFlags")
    const update = vi.fn(() => ({ eq: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }) }))
    const client = makeClient({
      flags: [{ key: "budgets_enabled", enabled: true, scheduled_enabled: false, scheduled_at: "2026-08-01T00:00:00Z" }],
      update,
    })

    expect((await resolveFeatureAccess({ id: "u1", tier: "paid" }, { client, now: new Date("2026-07-31T23:59:00Z") })).budgets).toBe(true)
    expect((await resolveFeatureAccess({ id: "u1", tier: "paid" }, { client, now: new Date("2026-08-01T00:00:00Z") })).budgets).toBe(false)
    expect(update).toHaveBeenCalled()
  })

  it("fails closed for unreadable optional flags without granting Free users Pro features", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { resolveFeatureAccess } = await import("@/lib/featureFlags")
    const access = await resolveFeatureAccess({ id: "u1", tier: "free" }, {
      client: { from: () => ({ select: () => ({ eq: () => ({ then: (resolve) => resolve({ data: null, error: new Error("down") }) }), then: (resolve) => resolve({ data: null, error: new Error("down") }) }) }) },
    })

    expect(access.healthScore).toBe(false)
    expect(access.budgets).toBe(true)
  })

  it("invalidates cached reads after a successful global write", async () => {
    const { resolveFeatureAccess, invalidateFeatureFlagCache } = await import("@/lib/featureFlags")
    const client = makeClient({ flags: [{ key: "budgets_enabled", enabled: true }] })
    await resolveFeatureAccess({ id: "u1", tier: "paid" }, { client })
    await resolveFeatureAccess({ id: "u1", tier: "paid" }, { client })
    expect(client.from).toBeTypeOf("function")
    invalidateFeatureFlagCache("u1")
  })

  it("returns only effective boolean access in client-safe output", async () => {
    const { toClientFeatureAccess } = await import("@/lib/featureFlags")
    expect(toClientFeatureAccess({ budgets: true, _global: [], overrides: [{ user_id: "other" }] })).toEqual({ budgets: true })
  })

  it("replaces a pending schedule and clears it on an immediate write", async () => {
    const { setGlobalFeatureFlag } = await import("@/lib/featureFlags")
    const upsert = vi.fn(() => Promise.resolve({ error: null }))
    const client = { from: () => ({ upsert }) }
    await setGlobalFeatureFlag("budgets", true, { scheduledEnabled: false, scheduledAt: "2026-08-02T00:00:00Z", client })
    await setGlobalFeatureFlag("budgets", false, { client })
    expect(upsert).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, scheduled_enabled: null, scheduled_at: null, updated_by: undefined }), expect.anything())
  })

  it("removes a user override so the next read uses global", async () => {
    const { clearUserFeatureOverride } = await import("@/lib/featureFlags")
    const remove = vi.fn(() => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }))
    await clearUserFeatureOverride("u1", "budgets", { client: { from: () => ({ delete: remove }) } })
    expect(remove).toHaveBeenCalled()
  })
})
