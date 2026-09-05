import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }))

function flagClient(row, error = null) {
  const result = { data: row, error }
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  }
  return { from: vi.fn(() => query), query }
}

function capacityClient(awaitingCount, pendingCount) {
  const awaiting = {
    select: vi.fn(() => awaiting),
    eq: vi.fn(() => Promise.resolve({ count: awaitingCount, error: null })),
  }
  const pending = {
    select: vi.fn(() => pending),
    eq: vi.fn(() => Promise.resolve({ count: pendingCount, error: null })),
  }
  let queryIndex = 0
  return { from: vi.fn(() => queryIndex++ === 0 ? awaiting : pending) }
}

describe("Pro registration payment adapter", () => {
  beforeEach(() => vi.resetModules())

  it("calls the service-role RPC with the server-controlled amount and deadline", async () => {
    const rpc = vi.fn(async () => ({ data: [{ id: "payment-1", status: "awaiting_payment" }], error: null }))
    const { createPaymentRequest } = await import("@/lib/paymentRegistration")
    const client = { rpc }

    const result = await createPaymentRequest({
      userId: "user-1",
      amount: 40000,
      expiresAt: "2026-08-04T01:02:03.000Z",
      replaceExpired: true,
      client,
    })

    expect(result).toEqual({ id: "payment-1", status: "awaiting_payment" })
    expect(rpc).toHaveBeenCalledWith("create_payment_request", {
      p_user_id: "user-1",
      p_amount: 40000,
      p_expires_at: "2026-08-04T01:02:03.000Z",
      p_replace_expired: true,
    })
  })

  it("maps database closure details to a stable safe error code", async () => {
    const { createPaymentRequest } = await import("@/lib/paymentRegistration")
    const client = { rpc: vi.fn(async () => ({ data: null, error: new Error("pro_registration_closed; internal detail") })) }

    await expect(createPaymentRequest({ userId: "user-1", amount: 40000, expiresAt: "2026-08-04T01:02:03.000Z", client }))
      .rejects.toMatchObject({ code: "PRO_REGISTRATION_CLOSED" })
  })

  it("evaluates one-time schedules at the request boundary and fails closed when unreadable", async () => {
    const { getProRegistrationState } = await import("@/lib/paymentRegistration")
    const dueClient = flagClient({
      enabled: true,
      scheduled_enabled: false,
      scheduled_at: "2026-08-02T01:02:03.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      updated_by: "admin@example.com",
    })
    const due = await getProRegistrationState({ client: dueClient, now: new Date("2026-08-02T01:02:03.000Z") })
    expect(due).toEqual(expect.objectContaining({ open: false, scheduledAt: null, updatedBy: "admin@example.com" }))

    const futureClient = flagClient({ enabled: false, scheduled_enabled: true, scheduled_at: "2026-08-02T02:02:03.000Z" })
    const future = await getProRegistrationState({ client: futureClient, now: new Date("2026-08-02T01:02:03.000Z") })
    expect(future).toEqual(expect.objectContaining({ open: false, scheduledAt: "2026-08-02T02:02:03.000Z", scheduledEnabled: true }))

    const missingClient = flagClient(null)
    await expect(getProRegistrationState({ client: missingClient })).resolves.toEqual(expect.objectContaining({ open: false }))
    const unreadableClient = flagClient(null, new Error("database unavailable"))
    await expect(getProRegistrationState({ client: unreadableClient })).rejects.toThrow("database unavailable")
  })

  it("reads exact awaiting and pending capacity counts", async () => {
    const { getPaymentRegistrationCapacity } = await import("@/lib/paymentRegistration")
    const client = capacityClient(3, 2)

    await expect(getPaymentRegistrationCapacity({ client })).resolves.toEqual({ awaitingCount: 3, pendingCount: 2 })
  })
})
