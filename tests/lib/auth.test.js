import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { refreshAccessToken } from "@/lib/auth"

describe("refreshAccessToken", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("exchanges refresh_token for new access_token at Google", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        expires_in: 3600,
        refresh_token: "rotated-refresh-token",
      }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    const token = {
      accessToken: "old-access-token",
      refreshToken: "old-refresh-token",
      accessTokenExpires: Date.now() - 1000,
    }

    const result = await refreshAccessToken(token)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe("https://oauth2.googleapis.com/token")
    expect(init.method).toBe("POST")
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded")
    const body = new URLSearchParams(init.body)
    expect(body.get("client_id")).toBe("test-client-id")
    expect(body.get("client_secret")).toBe("test-client-secret")
    expect(body.get("grant_type")).toBe("refresh_token")
    expect(body.get("refresh_token")).toBe("old-refresh-token")
    expect(result.accessToken).toBe("new-access-token")
    expect(result.refreshToken).toBe("rotated-refresh-token")
    expect(result.accessTokenExpires).toBeGreaterThan(Date.now())
  })

  it("keeps the existing refresh_token if Google doesn't rotate it", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-access-token",
        expires_in: 3600,
      }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    const token = {
      accessToken: "old-access-token",
      refreshToken: "unchanged-refresh-token",
      accessTokenExpires: Date.now() - 1000,
    }

    const result = await refreshAccessToken(token)

    expect(result.refreshToken).toBe("unchanged-refresh-token")
  })

  it("returns error flag when Google responds with non-OK", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "invalid_grant" }),
    })
    vi.stubGlobal("fetch", fetchSpy)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const token = {
      accessToken: "old-access-token",
      refreshToken: "expired-refresh-token",
      accessTokenExpires: Date.now() - 1000,
    }

    const result = await refreshAccessToken(token)

    expect(result.accessToken).toBe("old-access-token")
    expect(result.refreshToken).toBe("expired-refresh-token")
    expect(result.error).toBe("RefreshAccessTokenError")
    expect(errorSpy).toHaveBeenCalled()
  })

  it("returns error flag when fetch throws (network error)", async () => {
    const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"))
    vi.stubGlobal("fetch", fetchSpy)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const token = {
      accessToken: "old-access-token",
      refreshToken: "refresh-token",
      accessTokenExpires: Date.now() - 1000,
    }

    const result = await refreshAccessToken(token)

    expect(result.error).toBe("RefreshAccessTokenError")
    expect(errorSpy).toHaveBeenCalled()
  })

  it("computes accessTokenExpires relative to now using expires_in", async () => {
    const before = Date.now()
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "tok",
        expires_in: 7200,
      }),
    })
    vi.stubGlobal("fetch", fetchSpy)

    const token = { accessToken: "old", refreshToken: "rt", accessTokenExpires: 0 }
    const result = await refreshAccessToken(token)

    expect(result.accessTokenExpires).toBeGreaterThanOrEqual(before + 7200 * 1000)
    expect(result.accessTokenExpires).toBeLessThanOrEqual(Date.now() + 7200 * 1000)
  })
})
