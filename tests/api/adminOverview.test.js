import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminMock = vi.fn()
const fromMock = vi.fn()

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: requireAdminMock }))
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: fromMock } }))

function paymentsQuery() {
  let status = ""
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column, value) => { status = value; return builder }),
    range: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve({
      data: status === "pending" ? [{ amount: 40000 }, { amount: 40000 }] : [{ amount: 40000 }],
      error: null,
    }).then(resolve, reject),
  }
  return builder
}

function usersQuery() {
  let tier = ""
  const builder = {
    select: vi.fn(() => builder),
    is: vi.fn(() => builder),
    eq: vi.fn((column, value) => { tier = value; return builder }),
    then: (resolve, reject) => Promise.resolve({
      count: tier === "paid" ? 3 : 10,
      error: null,
    }).then(resolve, reject),
  }
  return builder
}

describe("admin overview API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" })
    fromMock.mockImplementation((table) => (table === "payments" ? paymentsQuery() : usersQuery()))
  })

  it("aggregates pending queue, revenue, and user counts for admins", async () => {
    const { GET } = await import("@/app/api/admin/overview/route")
    const response = await GET(new Request("http://localhost/api/admin/overview"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      pendingCount: 2,
      pendingAmount: 80000,
      approvedCount: 1,
      approvedRevenue: 40000,
      totalUsers: 10,
      paidUsers: 3,
    })
  })

  it("rejects non-admin access before reading any table", async () => {
    requireAdminMock.mockResolvedValue({ error: "forbidden" })
    const { GET } = await import("@/app/api/admin/overview/route")

    const response = await GET(new Request("http://localhost/api/admin/overview"))

    expect(response.status).toBe(403)
    expect(fromMock).not.toHaveBeenCalled()
  })
})
