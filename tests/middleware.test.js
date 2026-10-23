import { describe, expect, it, vi } from "vitest"

vi.mock("next/server", () => ({
  NextResponse: {
    next: () => new Response(null, { status: 200 }),
    json: (body, init) => new Response(JSON.stringify(body), {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
    }),
  },
}))

describe("API middleware protection", () => {
  it("uses a separate NextAuth bucket and returns Retry-After when exceeded", async () => {
    const { middleware, resetApiRateLimits } = await import("@/middleware")
    resetApiRateLimits()
    const request = new Request("https://example.test/api/auth/session", {
      headers: { "x-real-ip": "198.51.100.10" },
    })

    for (let i = 0; i < 60; i += 1) expect(middleware(request).status).toBe(200)
    const response = middleware(request)

    expect(response.status).toBe(429)
    expect(response.headers.get("Retry-After")).toBeTruthy()
  })

  it("gives admin endpoints their own roomier bucket while public payments stay strict", async () => {
    const { middleware, resetApiRateLimits } = await import("@/middleware")
    resetApiRateLimits()
    const admin = new Request("https://example.test/api/admin/payments", {
      headers: { "x-real-ip": "198.51.100.13" },
    })
    const pub = new Request("https://example.test/api/payments", {
      headers: { "x-real-ip": "198.51.100.13" },
    })

    // 30 admin calls pass: well beyond the public payment limit of 10/min.
    for (let i = 0; i < 30; i += 1) expect(middleware(admin).status).toBe(200)
    // The public payment bucket for the same IP is unaffected and still strict.
    for (let i = 0; i < 10; i += 1) expect(middleware(pub).status).toBe(200)
    expect(middleware(pub).status).toBe(429)
    // The admin bucket still caps, at 60/min.
    for (let i = 0; i < 30; i += 1) expect(middleware(admin).status).toBe(200)
    expect(middleware(admin).status).toBe(429)
  })

  it("gives payment and destructive endpoints their stricter buckets", async () => {
    const { middleware, resetApiRateLimits } = await import("@/middleware")
    resetApiRateLimits()
    const payment = new Request("https://example.test/api/download-apk", {
      headers: { "x-real-ip": "198.51.100.11" },
    })
    const account = new Request("https://example.test/api/account", {
      method: "DELETE",
      headers: { "x-real-ip": "198.51.100.12" },
    })

    for (let i = 0; i < 10; i += 1) expect(middleware(payment).status).toBe(200)
    expect(middleware(payment).status).toBe(429)
    for (let i = 0; i < 5; i += 1) expect(middleware(account).status).toBe(200)
    expect(middleware(account).status).toBe(429)
  })
})
