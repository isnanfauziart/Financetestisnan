import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({})),
}))

vi.mock("@supabase/supabase-js", () => ({ createClient }))

describe("supabase admin client", () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    vi.resetModules()
    createClient.mockClear()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey
  })

  it("forces no-store fetches while preserving request init fields", async () => {
    await import("@/lib/supabaseAdmin")

    const options = createClient.mock.calls[0][2]
    expect(options.global?.fetch).toEqual(expect.any(Function))

    const baseFetch = vi.fn(async (input, init) => ({ input, init }))
    vi.stubGlobal("fetch", baseFetch)

    const response = await options.global.fetch("https://example.supabase.co/rest/v1/users", {
      method: "GET",
      headers: { authorization: "Bearer token" },
      cache: "force-cache",
    })

    expect(baseFetch).toHaveBeenCalledWith("https://example.supabase.co/rest/v1/users", {
      method: "GET",
      headers: { authorization: "Bearer token" },
      cache: "no-store",
    })
    expect(response.init.cache).toBe("no-store")
  })
})
