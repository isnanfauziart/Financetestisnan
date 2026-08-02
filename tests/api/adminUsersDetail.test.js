import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminMock = vi.fn()
const fromMock = vi.fn()
const getUsageMock = vi.fn()
const getCurrentMonthPeriodMock = vi.fn()
const getNextMonthlyResetAtMock = vi.fn()

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: requireAdminMock }))
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: fromMock } }))
vi.mock("@/lib/usage", () => ({
  getUsage: getUsageMock,
  getCurrentMonthPeriod: getCurrentMonthPeriodMock,
  getNextMonthlyResetAt: getNextMonthlyResetAtMock,
}))

function query({ data = [], error = null } = {}) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: data[0] || null, error })),
    then: (resolve, reject) => Promise.resolve({ data, error }).then(resolve, reject),
  }
  return builder
}

function request(path) {
  return new Request(`http://localhost${path}`)
}

describe("admin user detail API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" })
    getCurrentMonthPeriodMock.mockReturnValue("2026-08")
    getNextMonthlyResetAtMock.mockReturnValue("2026-09-01T00:00:00+07:00")
    getUsageMock.mockResolvedValue(28)
  })

  it("returns safe account, transaction usage, and payment metadata", async () => {
    const userQuery = query({ data: [{
      id: "user-1",
      email: "alice@example.com",
      name: "Alice",
      avatar_url: null,
      tier: "free",
      created_at: "2026-08-01T00:00:00.000Z",
      last_seen_at: "2026-08-02T00:00:00.000Z",
      spreadsheet_id: "private-sheet-id",
      deleted_at: null,
    }] })
    const adminQuery = query({ data: [] })
    const paymentQuery = query({ data: [{
      id: "payment-1",
      amount: 40000,
      status: "approved",
      created_at: "2026-08-01T00:00:00.000Z",
      proof_url: "private/proof.png",
    }] })
    fromMock.mockImplementation((table) => table === "users" ? userQuery : table === "admins" ? adminQuery : paymentQuery)

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const response = await GET(request("/api/admin/users/user-1"), { params: { id: "user-1" } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.user).toEqual(expect.objectContaining({
      id: "user-1",
      sheetConnected: true,
      isAdmin: false,
    }))
    expect(body.user).not.toHaveProperty("spreadsheet_id")
    expect(body.usage.transactions).toEqual({
      period: "2026-08",
      current: 28,
      limit: 75,
      resetAt: "2026-09-01T00:00:00+07:00",
      verified: true,
    })
    expect(body.payments).toEqual([expect.objectContaining({
      reference: "PAY-PAYMENT1",
      hasProof: true,
    })])
    expect(body.payments[0]).not.toHaveProperty("proof_url")
  })

  it("can retry only the payment section", async () => {
    const userQuery = query({ data: [{ id: "user-1", email: "alice@example.com", tier: "paid", deleted_at: null }] })
    const paymentQuery = query({ data: [] })
    fromMock.mockImplementation((table) => table === "users" ? userQuery : paymentQuery)

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const response = await GET(request("/api/admin/users/user-1?section=payments"), { params: { id: "user-1" } })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ payments: [] })
    expect(getUsageMock).not.toHaveBeenCalled()
  })

  it("rejects a missing user and non-admin access", async () => {
    const { GET } = await import("@/app/api/admin/users/[id]/route")

    fromMock.mockReturnValue(query({ data: [] }))
    const missingResponse = await GET(request("/api/admin/users/missing"), { params: { id: "missing" } })
    expect(missingResponse.status).toBe(404)

    requireAdminMock.mockResolvedValue({ error: "forbidden" })
    const forbiddenResponse = await GET(request("/api/admin/users/user-1"), { params: { id: "user-1" } })
    expect(forbiddenResponse.status).toBe(403)
  })
})
