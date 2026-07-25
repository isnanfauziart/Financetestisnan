import { describe, expect, it } from "vitest"

import { getActivePayment, getPaymentDeadline, getPaymentState } from "@/components/PaymentQrisFlow"

describe("PaymentQrisFlow helpers", () => {
  it("uses the newest active payment and ignores finished history", () => {
    const active = getActivePayment([
      { id: "old", status: "approved", created_at: "2026-07-24T00:00:00.000Z" },
      { id: "pending", status: "pending", created_at: "2026-07-25T01:00:00.000Z" },
      { id: "awaiting", status: "awaiting_payment", created_at: "2026-07-25T00:00:00.000Z" },
    ])

    expect(active.id).toBe("pending")
  })

  it("formats the payment deadline in WIB", () => {
    const deadline = getPaymentDeadline({
      created_at: "2026-07-25T02:00:00.000Z",
      expires_at: "2026-07-27T02:00:00.000Z",
    })

    expect(deadline).toContain("27 Jul 2026")
    expect(deadline).toContain("09.00 WIB")
  })

  it("shows replacement state only during grace after the payment deadline", () => {
    const payment = {
      status: "awaiting_payment",
      created_at: "2026-07-25T00:00:00.000Z",
      expires_at: "2026-07-27T00:00:00.000Z",
    }

    expect(getPaymentState(payment, new Date("2026-07-27T00:30:00.000Z"))).toMatchObject({
      inGrace: true,
      canReplace: true,
      canUpload: true,
    })
    expect(getPaymentState(payment, new Date("2026-07-27T01:01:00.000Z"))).toMatchObject({
      inGrace: false,
      canReplace: false,
      canUpload: false,
    })
  })
})
