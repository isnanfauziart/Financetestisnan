import { beforeEach, describe, expect, it, vi } from "vitest"

const getPaymentUserMock = vi.fn()
const featureUnavailableResponseMock = vi.fn()
const createPaymentRequestMock = vi.fn()

vi.mock("@/lib/paymentAuth", () => ({ getPaymentUser: getPaymentUserMock }))
vi.mock("@/lib/featureGuard", () => ({ featureUnavailableResponse: featureUnavailableResponseMock }))
vi.mock("@/lib/paymentRegistration", () => ({
  createPaymentRequest: createPaymentRequestMock,
  PRO_REGISTRATION_CLOSED_MESSAGE: "Pendaftaran Pro sedang ditutup sementara. Silakan coba lagi nanti.",
}))
vi.mock("@/lib/payments", () => ({
  PAYMENT_AMOUNT: 40000,
  getPaymentWindow: vi.fn(),
  normalizePaymentForClient: vi.fn((payment) => payment),
}))
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: vi.fn() } }))

function request(body = {}) {
  return new Request("http://localhost/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("payment registration capacity boundary", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-02T01:02:03.000Z"))
    getPaymentUserMock.mockResolvedValue({
      id: "user-1",
      tier: "free",
      featureAccess: { paymentQris: true },
    })
    featureUnavailableResponseMock.mockReturnValue(null)
    createPaymentRequestMock.mockResolvedValue({
      id: "payment-1",
      user_id: "user-1",
      amount: 40000,
      status: "awaiting_payment",
      created_at: "2026-08-02T01:02:03.000Z",
    })
  })

  it("delegates new and replacement requests to the atomic registration RPC adapter", async () => {
    const { POST } = await import("@/app/api/payments/route")

    const first = await POST(request())
    const replacement = await POST(request({ replaceExpired: true }))

    expect(first.status).toBe(201)
    expect(replacement.status).toBe(201)
    expect(createPaymentRequestMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userId: "user-1",
      amount: 40000,
      replaceExpired: false,
      expiresAt: "2026-08-04T01:02:03.000Z",
    }))
    expect(createPaymentRequestMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: "user-1",
      replaceExpired: true,
    }))
  })

  it("maps an atomic closed result to a stable Indonesian response", async () => {
    createPaymentRequestMock.mockRejectedValueOnce(Object.assign(new Error("pro_registration_closed"), { code: "PRO_REGISTRATION_CLOSED" }))
    const { POST } = await import("@/app/api/payments/route")

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      error: "PRO_REGISTRATION_CLOSED",
      message: "Pendaftaran Pro sedang ditutup sementara. Silakan coba lagi nanti.",
    })
  })

  it("preserves the one-active-payment conflict from the atomic boundary", async () => {
    createPaymentRequestMock.mockRejectedValueOnce(Object.assign(new Error("payment_active"), { code: "ACTIVE_PAYMENT" }))
    const { POST } = await import("@/app/api/payments/route")

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body).toEqual({ error: "Anda masih memiliki satu pembayaran aktif." })
  })

  it("keeps QRIS emergency shutdown ahead of registration capacity", async () => {
    featureUnavailableResponseMock.mockReturnValueOnce(Response.json({ error: "FEATURE_DISABLED" }, { status: 403 }))
    const { POST } = await import("@/app/api/payments/route")

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(createPaymentRequestMock).not.toHaveBeenCalled()
  })
})
