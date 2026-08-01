import { describe, expect, it } from "vitest"

describe("rate limiter", () => {
  it("allows the configured number of requests and returns retry metadata after the limit", async () => {
    const { createRateLimiter } = await import("@/lib/rateLimit")
    let now = 1_000
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => now })

    expect(limiter.check("user-1")).toMatchObject({ allowed: true, remaining: 1 })
    expect(limiter.check("user-1")).toMatchObject({ allowed: true, remaining: 0 })
    expect(limiter.check("user-1")).toMatchObject({ allowed: false, retryAfterSeconds: 60 })

    now += 60_000
    expect(limiter.check("user-1")).toMatchObject({ allowed: true, remaining: 1 })
  })
})
