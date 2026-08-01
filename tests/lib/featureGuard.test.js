import { describe, expect, it } from "vitest"

describe("server feature guard", () => {
  it("blocks explicitly disabled access with a simple reversible message", async () => {
    const { featureUnavailableResponse } = await import("@/lib/featureGuard")
    const response = featureUnavailableResponse({ featureAccess: { bills: false } }, "bills", new Request("http://localhost/api/bills"))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: "FEATURE_DISABLED",
      message: "Fitur sedang tidak tersedia.",
      feature: "bills",
    })
  })

  it("does not block mocked/legacy auth contexts without effective access", async () => {
    const { featureUnavailableResponse } = await import("@/lib/featureGuard")
    expect(featureUnavailableResponse({ tier: "paid" }, "bills", new Request("http://localhost"))).toBeNull()
    expect(featureUnavailableResponse({ featureAccess: { bills: true } }, "bills", new Request("http://localhost"))).toBeNull()
  })
})
