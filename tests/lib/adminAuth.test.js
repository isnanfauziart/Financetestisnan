import { beforeEach, describe, expect, it, vi } from "vitest"

const getTokenMock = vi.fn()
const fromMock = vi.fn()

vi.mock("next-auth/jwt", () => ({
  getToken: getTokenMock,
}))

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

describe("admin auth", () => {
  beforeEach(() => {
    vi.resetModules()
    getTokenMock.mockReset()
    fromMock.mockReset()
  })

  it("normalizes email and limits admin lookup to one row", async () => {
    getTokenMock.mockResolvedValue({ accessToken: "token", email: " Admin@Example.com " })
    const maybeSingle = vi.fn().mockResolvedValue({ data: { email: "admin@example.com" }, error: null })
    const limit = vi.fn(() => ({ maybeSingle }))
    const ilike = vi.fn(() => ({ limit }))
    const select = vi.fn(() => ({ ilike }))
    fromMock.mockReturnValue({ select })

    const { requireAdmin } = await import("@/lib/adminAuth")
    const result = await requireAdmin(new Request("http://localhost/api/admin/payments"))

    expect(ilike).toHaveBeenCalledWith("email", "admin@example.com")
    expect(limit).toHaveBeenCalledWith(1)
    expect(result).toEqual({ email: "admin@example.com" })
  })
})
