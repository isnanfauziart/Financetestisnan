import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/usage", async () => {
  const actual = await vi.importActual("@/lib/usage")
  return {
    ...actual,
    getUsage: vi.fn(),
  }
})

vi.mock("@/lib/sheets", () => ({
  batchGetSheetData: vi.fn(async () => [
    { values: [["Kategori", "Bulan", "Tahun"], ["Makan", "Jul", "2026"]] },
    { values: [["ID"], ["goal-1"]] },
    { values: [["ID"], ["debt-1"], ["debt-2"]] },
    { values: [["ID"]] },
    { values: [["ID"], ["bill-1"]] },
  ]),
  getSheetData: vi.fn(),
}))

vi.mock("@/lib/featureFlags", () => ({
  resolveFeatureAccess: vi.fn(async () => ({ budgets: true, healthScore: true })),
  toClientFeatureAccess: vi.fn(access => access),
  toClientFeatureAvailability: vi.fn(access => access),
}))

describe("/api/me", () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("returns effective entitlement, quotas, and non-metered sheet-backed counts", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-10T01:00:00.000Z"))

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getUsage } = await import("@/lib/usage")
    getAuthContext.mockResolvedValue({
      user: { id: "user-1", email: "admin@example.com", tier: "free" },
      tier: "paid",
      isAdmin: true,
      entitlementVerified: true,
    })
    getUsage.mockResolvedValue(12)

    const { GET } = await import("@/app/api/me/route")
    const res = await GET(new Request("http://localhost/api/me"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tier).toBe("paid")
    expect(body.isAdmin).toBe(true)
    expect(body.entitlementVerified).toBe(true)
    expect(body.usageVerified).toBe(true)
    expect(body.upgrade).toBe("/upgrade")
    expect(body.usage.transactions).toMatchObject({
      current: 12,
      limit: null,
      metered: true,
      source: "usage",
      period: "2026-07",
      resetAt: "2026-08-01T00:00:00+07:00",
    })
    expect(body.usage.budgets).toMatchObject({ current: 1, limit: null, metered: false, source: "sheets" })
    expect(body.usage.insights).toMatchObject({ current: null, limit: null, metered: false, source: "stable-weekly" })
    expect(body.usage.transactions.warning).toBeNull()
    expect(body.features).toEqual({
      healthScore: true,
      cashFlowForecast: true,
      anomalyAlerts: true,
      financialIndependence: true,
      whatIf: true,
      yearInReview: true,
    })
    expect(body.monthlyPdfWatermark).toBe(false)
    expect(body.history.months).toBeNull()
  })

  it("returns ordinary Free limits with Sheet-backed counts", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-10T01:00:00.000Z"))

    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getUsage } = await import("@/lib/usage")
    getAuthContext.mockResolvedValue({
      user: { id: "user-2", email: "free@example.com", tier: "free" },
      tier: "free",
      isAdmin: false,
      entitlementVerified: true,
    })
    getUsage.mockResolvedValue(74)

    const { GET } = await import("@/app/api/me/route")
    const res = await GET(new Request("http://localhost/api/me"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tier).toBe("free")
    expect(body.usage.transactions).toMatchObject({
      current: 74,
      limit: 75,
      warningAt: 60,
      limitAt: 75,
      metered: true,
      warning: "near",
    })
    expect(body.usage.goals).toMatchObject({ current: 1, limit: 1, metered: false, source: "sheets", warning: "reached" })
    expect(body.usage.insights).toMatchObject({
      current: null,
      limit: 3,
      metered: false,
      source: "stable-weekly",
      period: "2026-W28",
      resetAt: "2026-07-13T00:00:00+07:00",
    })
    expect(body.features.healthScore).toBe(false)
    expect(body.monthlyPdfWatermark).toBe(true)
    expect(body.history.months).toBe(4)
  })

  it("returns stored-paid Pro as unlimited without admin status", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getUsage } = await import("@/lib/usage")
    getAuthContext.mockResolvedValue({
      user: { id: "user-3", email: "paid@example.com", tier: "paid" },
      tier: "paid",
      isAdmin: false,
      entitlementVerified: true,
    })
    getUsage.mockResolvedValue(400)

    const { GET } = await import("@/app/api/me/route")
    const res = await GET(new Request("http://localhost/api/me"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tier).toBe("paid")
    expect(body.isAdmin).toBe(false)
    expect(body.usage.transactions.limit).toBeNull()
    expect(body.usage.transactions.warning).toBeNull()
    expect(body.usage.bills.limit).toBeNull()
    expect(body.features.yearInReview).toBe(true)
    expect(body.monthlyPdfWatermark).toBe(false)
  })

  it("marks Free transaction usage as reached at the monthly limit", async () => {
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getUsage } = await import("@/lib/usage")
    getAuthContext.mockResolvedValue({
      user: { id: "user-4", email: "full@example.com", tier: "free" },
      tier: "free",
      isAdmin: false,
      entitlementVerified: true,
    })
    getUsage.mockResolvedValue(75)

    const { GET } = await import("@/app/api/me/route")
    const res = await GET(new Request("http://localhost/api/me"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.usage.transactions.warning).toBe("reached")
  })

  it("returns 503 when transaction usage cannot be verified", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getUsage } = await import("@/lib/usage")
    getAuthContext.mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", tier: "free" },
      tier: "free",
      isAdmin: false,
      entitlementVerified: true,
    })
    getUsage.mockRejectedValue(new Error("rpc unavailable"))

    const { GET } = await import("@/app/api/me/route")
    const res = await GET(new Request("http://localhost/api/me"))
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(res.headers.get("Retry-After")).toBe("30")
    expect(body).toEqual({
      error: "FEATURE_LIMIT_UNVERIFIABLE",
      message: "Kuota transaksi belum bisa diverifikasi. Coba lagi sebentar.",
      retryable: true,
    })
  })

  it("keeps verified paid/admin entitlement readable when transaction usage is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getUsage } = await import("@/lib/usage")
    getAuthContext.mockResolvedValue({
      user: { id: "user-5", email: "admin@example.com", tier: "free" },
      tier: "paid",
      isAdmin: true,
      entitlementVerified: true,
    })
    getUsage.mockRejectedValue(new Error("rpc unavailable"))

    const { GET } = await import("@/app/api/me/route")
    const res = await GET(new Request("http://localhost/api/me"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tier).toBe("paid")
    expect(body.usageVerified).toBe(false)
    expect(body.usage.transactions).toMatchObject({
      current: null,
      limit: null,
      metered: true,
      source: "usage",
      warning: null,
    })
  })

  it("keeps /api/me readable with null Sheet counts when Sheets is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { getAuthContext } = await import("@/lib/apiAuth")
    const { getUsage } = await import("@/lib/usage")
    const { batchGetSheetData } = await import("@/lib/sheets")
    getAuthContext.mockResolvedValue({
      user: { id: "user-6" },
      tier: "free",
      isAdmin: false,
      entitlementVerified: true,
      accessToken: "token",
      spreadsheetId: "sheet",
    })
    getUsage.mockResolvedValue(3)
    batchGetSheetData.mockRejectedValueOnce(new Error("sheets unavailable"))

    const { GET } = await import("@/app/api/me/route")
    const res = await GET(new Request("http://localhost/api/me"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.usageVerified).toBe(false)
    expect(body.usage.budgets.current).toBeNull()
    expect(body.usage.goals.current).toBeNull()
  })
})
