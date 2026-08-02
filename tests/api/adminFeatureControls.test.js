import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminMock = vi.fn()
const setGlobalFeatureFlagMock = vi.fn()
const setUserFeatureOverrideMock = vi.fn()
const clearUserFeatureOverrideMock = vi.fn()
const fromMock = vi.fn()

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: requireAdminMock }))
vi.mock("@/lib/featureFlags", () => ({
  FEATURE_REGISTRY: {
    budgets: { flagKey: "budgets_enabled", protected: false, paidOnly: false },
    healthScore: { flagKey: "health_score", protected: false, paidOnly: true },
    authentication: { protected: true },
  },
  setGlobalFeatureFlag: setGlobalFeatureFlagMock,
  setUserFeatureOverride: setUserFeatureOverrideMock,
  clearUserFeatureOverride: clearUserFeatureOverrideMock,
}))
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: fromMock } }))

function request(body) {
  return new Request("http://localhost/api/admin/features", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function query(rows = [], error = null) {
  const builder = {
    select: vi.fn(() => builder),
    or: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve({ data: rows, error }).then(resolve, reject),
  }
  return builder
}

describe("admin feature controls", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" })
    setGlobalFeatureFlagMock.mockResolvedValue(undefined)
    setUserFeatureOverrideMock.mockResolvedValue(undefined)
    clearUserFeatureOverrideMock.mockResolvedValue(undefined)
  })

  afterEach(() => vi.useRealTimers())

  it("rejects non-admin access before reading or writing feature data", async () => {
    requireAdminMock.mockResolvedValue({ error: "forbidden" })
    const { GET } = await import("@/app/api/admin/features/route")

    const response = await GET(new Request("http://localhost/api/admin/features"))

    expect(response.status).toBe(403)
    expect(fromMock).not.toHaveBeenCalled()
    expect(setGlobalFeatureFlagMock).not.toHaveBeenCalled()
  })

  it("lists registry rows with the current global state and one pending schedule", async () => {
    const future = "2099-08-02T00:00:00.000Z"
    fromMock.mockReturnValue(query([
      { key: "budgets_enabled", enabled: true, description: "Budgets", scheduled_enabled: false, scheduled_at: future },
    ]))
    const { GET } = await import("@/app/api/admin/features/route")

    const response = await GET(new Request("http://localhost/api/admin/features"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.features).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "budgets", enabled: true, scheduledAt: future, scheduledEnabled: false }),
      expect.objectContaining({ key: "authentication", protected: true, enabled: true, scheduledAt: null }),
    ]))
  })

  it("updates a global flag and replaces a pending schedule with an immediate write", async () => {
    const { POST } = await import("@/app/api/admin/features/route")
    const scheduledAt = "2099-08-02T00:00:00.000Z"

    await POST(request({ key: "budgets", scope: "global", enabled: false, scheduledAt, scheduledEnabled: true }))
    await POST(request({ key: "budgets", scope: "global", enabled: true }))

    expect(setGlobalFeatureFlagMock).toHaveBeenNthCalledWith(1, "budgets", false, {
      scheduledAt,
      scheduledEnabled: true,
      updatedBy: "admin@example.com",
    })
    expect(setGlobalFeatureFlagMock).toHaveBeenNthCalledWith(2, "budgets", true, {
      scheduledAt: null,
      scheduledEnabled: null,
      updatedBy: "admin@example.com",
    })
  })

  it("returns success metadata for the admin confirmation row", async () => {
    setGlobalFeatureFlagMock.mockResolvedValueOnce({ updatedAt: "2026-08-02T01:02:03.000Z", updatedBy: "admin@example.com" })
    const { POST } = await import("@/app/api/admin/features/route")

    const response = await POST(request({ key: "budgets", scope: "global", enabled: false }))
    const body = await response.json()

    expect(body).toEqual(expect.objectContaining({
      ok: true,
      updatedAt: "2026-08-02T01:02:03.000Z",
      updatedBy: "admin@example.com",
    }))
  })

  it("sets selected user overrides, clears Use global, and leaves empty selection untouched", async () => {
    const userId = "11111111-1111-4111-8111-111111111111"
    const otherUserId = "22222222-2222-4222-8222-222222222222"
    const { POST } = await import("@/app/api/admin/features/route")

    await POST(request({ key: "healthScore", scope: "users", enabled: false, userIds: [userId, otherUserId] }))
    await POST(request({ key: "healthScore", scope: "users", enabled: null, userIds: [userId] }))
    await POST(request({ key: "healthScore", scope: "users", enabled: false, userIds: [] }))

    expect(setUserFeatureOverrideMock).toHaveBeenCalledTimes(2)
    expect(setUserFeatureOverrideMock).toHaveBeenCalledWith(userId, "healthScore", false, {
      scheduledAt: null,
      scheduledEnabled: null,
      updatedBy: "admin@example.com",
    })
    expect(setUserFeatureOverrideMock).toHaveBeenCalledWith(otherUserId, "healthScore", false, expect.any(Object))
    expect(clearUserFeatureOverrideMock).toHaveBeenCalledWith(userId, "healthScore")
  })

  it("searches existing users by safe fields, tier, and account age", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"))
    const usersQuery = query([{ id: "user-1", email: "alice@example.com", name: "Alice", tier: "paid", created_at: "2026-06-01T00:00:00.000Z", spreadsheet_id: "secret" }])
    fromMock.mockImplementation((table) => table === "admins" ? query([]) : usersQuery)
    const { GET } = await import("@/app/api/admin/users/route")

    const response = await GET(new Request("http://localhost/api/admin/users?search=alice&tier=paid&minAgeDays=30&maxAgeDays=90"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(usersQuery.or).toHaveBeenCalledWith("email.ilike.%alice%,name.ilike.%alice%")
    expect(usersQuery.eq).toHaveBeenCalledWith("tier", "paid")
    expect(usersQuery.lte).toHaveBeenCalledWith("created_at", "2026-07-02T00:00:00.000Z")
    expect(usersQuery.gte).toHaveBeenCalledWith("created_at", "2026-05-03T00:00:00.000Z")
    expect(body.users).toEqual([expect.objectContaining({
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
      tier: "paid",
      created_at: "2026-06-01T00:00:00.000Z",
      sheetConnected: true,
      isAdmin: false,
    })])
  })

  it("rejects protected features, malformed values, and past schedules without writes", async () => {
    const { POST } = await import("@/app/api/admin/features/route")

    const protectedResponse = await POST(request({ key: "authentication", scope: "global", enabled: false }))
    const invalidResponse = await POST(request({ key: "budgets", scope: "global", enabled: "false" }))
    const pastResponse = await POST(request({
      key: "budgets",
      scope: "global",
      enabled: true,
      scheduledAt: "2020-01-01T00:00:00.000Z",
      scheduledEnabled: false,
    }))

    expect(protectedResponse.status).toBe(400)
    expect(invalidResponse.status).toBe(400)
    expect(pastResponse.status).toBe(400)
    expect(setGlobalFeatureFlagMock).not.toHaveBeenCalled()
  })

  it("treats scalar JSON bodies as invalid requests", async () => {
    const { POST } = await import("@/app/api/admin/features/route")
    const response = await POST(new Request("http://localhost/api/admin/features", {
      method: "POST",
      body: "null",
      headers: { "content-type": "application/json" },
    }))

    expect(response.status).toBe(400)
    expect(setGlobalFeatureFlagMock).not.toHaveBeenCalled()
  })

  it("rejects invalid user filters", async () => {
    const { GET } = await import("@/app/api/admin/users/route")

    const response = await GET(new Request("http://localhost/api/admin/users?tier=staff"))

    expect(response.status).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })
})
