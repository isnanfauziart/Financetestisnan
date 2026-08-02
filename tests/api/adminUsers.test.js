import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminMock = vi.fn()
const fromMock = vi.fn()

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: requireAdminMock }))
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: fromMock } }))

function query({ data = [], count = null, error = null } = {}) {
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
    maybeSingle: vi.fn(async () => ({ data: data[0] || null, error })),
    then: (resolve, reject) => Promise.resolve({ data, count, error }).then(resolve, reject),
  }
  return builder
}

function request(path) {
  return new Request(`http://localhost${path}`)
}

describe("admin users directory API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" })
  })

  it("returns a paginated safe directory with summaries and admin badges", async () => {
    const usersQuery = query({
      count: 72,
      data: [{
        id: "user-1",
        email: "alice@example.com",
        name: "Alice",
        avatar_url: "https://example.com/avatar.png",
        tier: "paid",
        created_at: "2026-08-01T00:00:00.000Z",
        last_seen_at: "2026-08-02T00:00:00.000Z",
        spreadsheet_id: "private-sheet-id",
        deleted_at: null,
      }],
    })
    const adminQuery = query({ data: [{ email: "alice@example.com" }] })
    fromMock.mockImplementation((table) => table === "admins" ? adminQuery : usersQuery)

    const { GET } = await import("@/app/api/admin/users/route")
    const response = await GET(request("/api/admin/users?page=2&pageSize=25&activity=7d&sheet=connected"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.page).toBe(2)
    expect(body.pageSize).toBe(25)
    expect(body.total).toBe(72)
    expect(body.users).toEqual([expect.objectContaining({
      id: "user-1",
      isAdmin: true,
      sheetConnected: true,
      last_seen_at: "2026-08-02T00:00:00.000Z",
    })])
    expect(body.users[0]).not.toHaveProperty("spreadsheet_id")
    expect(usersQuery.range).toHaveBeenCalledWith(25, 49)
    expect(body.summary).toEqual(expect.objectContaining({
      total: expect.any(Number),
      free: expect.any(Number),
      paid: expect.any(Number),
      active7d: expect.any(Number),
      sheetConnected: expect.any(Number),
    }))
  })

  it("rejects unsupported page sizes and activity filters", async () => {
    const { GET } = await import("@/app/api/admin/users/route")

    const pageResponse = await GET(request("/api/admin/users?pageSize=30"))
    const activityResponse = await GET(request("/api/admin/users?activity=year"))

    expect(pageResponse.status).toBe(400)
    expect(activityResponse.status).toBe(400)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it("rejects non-admin access before reading users", async () => {
    requireAdminMock.mockResolvedValue({ error: "forbidden" })
    const { GET } = await import("@/app/api/admin/users/route")

    const response = await GET(request("/api/admin/users"))

    expect(response.status).toBe(403)
    expect(fromMock).not.toHaveBeenCalled()
  })
})
