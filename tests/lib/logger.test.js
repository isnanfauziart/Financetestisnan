import { describe, expect, it, vi } from "vitest"

describe("safe request logging", () => {
  it("logs a request id and error type without sensitive messages", async () => {
    const { getRequestId, logError } = await import("@/lib/logger")
    const request = new Request("http://localhost", { headers: { "x-request-id": "req-123" } })
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(getRequestId(request)).toBe("req-123")
    logError("Payments", new Error("secret-token-value"), request)

    expect(spy).toHaveBeenCalledWith("[Payments]", expect.stringContaining('"requestId":"req-123"'))
    expect(spy.mock.calls[0].join(" ")).not.toContain("secret-token-value")
    spy.mockRestore()
  })
})
