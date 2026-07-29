import { beforeEach, describe, expect, it, vi } from "vitest"

const rpcMock = vi.fn()

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    rpc: rpcMock,
  },
}))

describe("usage helpers", () => {
  beforeEach(() => {
    vi.resetModules()
    rpcMock.mockReset()
  })

  it("defers null limits to SQL so Free invalid limits fail closed there", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null })

    const { checkLimit } = await import("@/lib/usage")
    const result = await checkLimit("user-1", "transactions", null, "2026-07")

    expect(result).toBe(false)
    expect(rpcMock).toHaveBeenCalledWith("check_usage_limit", {
      p_user_id: "user-1",
      p_feature: "transactions",
      p_period: "2026-07",
      p_limit: null,
    })
  })
})
