import { afterEach, describe, expect, it, vi } from "vitest"

const getEnvironmentStatus = vi.fn()

describe("/api/health", () => {
  afterEach(() => {
    vi.resetModules()
    getEnvironmentStatus.mockReset()
  })

  it("returns safe healthy configuration status without secret values", async () => {
    getEnvironmentStatus.mockReturnValue({ configured: true, missing: [], presentCount: 11, requiredCount: 11 })
    vi.doMock("@/lib/env", () => ({ getEnvironmentStatus }))
    const { GET } = await import("@/app/api/health/route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Request-Id")).toBeTruthy()
    expect(body).toMatchObject({ ok: true, configured: true })
    expect(body).not.toHaveProperty("values")
  })

  it("returns 503 with only missing names when configuration is incomplete", async () => {
    getEnvironmentStatus.mockReturnValue({ configured: false, missing: ["NEXTAUTH_SECRET"], presentCount: 10, requiredCount: 11 })
    vi.doMock("@/lib/env", () => ({ getEnvironmentStatus }))
    const { GET } = await import("@/app/api/health/route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({ ok: false, configured: false, missing: ["NEXTAUTH_SECRET"] })
    expect(body).not.toHaveProperty("values")
  })
})
