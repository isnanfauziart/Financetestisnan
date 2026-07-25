import { describe, expect, it } from "vitest"

import {
  PAYMENT_AMOUNT,
  getPaymentWindow,
  isPaymentAtWithinWindow,
  makePaymentReference,
  normalizePaymentForClient,
  validateProof,
  whatsappUrl,
} from "@/lib/payments"

describe("payment rules", () => {
  it("uses the approved fixed amount and stable short reference", () => {
    expect(PAYMENT_AMOUNT).toBe(40000)
    expect(makePaymentReference("ca761232-ed42-11ce-bacd-00aa0057b223")).toBe("PAY-CA761232")
  })

  it("keeps proof upload open for one hour after the 48-hour deadline", () => {
    const createdAt = "2026-07-25T00:00:00.000Z"
    expect(getPaymentWindow(createdAt, new Date("2026-07-27T00:30:00.000Z"))).toEqual({
      expiresAt: "2026-07-27T00:00:00.000Z",
      graceEndsAt: "2026-07-27T01:00:00.000Z",
      expired: true,
      inGrace: true,
      canUpload: true,
    })
    expect(getPaymentWindow(createdAt, new Date("2026-07-27T01:00:00.001Z")).canUpload).toBe(false)
  })

  it("accepts minute-rounded WIB input when the request was created seconds later", () => {
    expect(isPaymentAtWithinWindow(
      "2026-07-25T11:18:00.000Z",
      "2026-07-25T11:18:35.000Z",
      "2026-07-27T11:18:35.000Z"
    )).toBe(true)
  })

  it("accepts only approved image types up to 5 MB", () => {
    expect(validateProof({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull()
    expect(validateProof({ type: "application/pdf", size: 10 })).toMatch(/JPEG/)
    expect(validateProof({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/)
  })

  it("never exposes the private proof path to clients", () => {
    const result = normalizePaymentForClient({
      id: "ca761232-ed42-11ce-bacd-00aa0057b223",
      proof_url: "secret/user/image.jpg",
      amount: 40000,
      status: "pending",
    })
    expect(result.reference).toBe("PAY-CA761232")
    expect(result.hasProof).toBe(true)
    expect(result.proof_url).toBeUndefined()
  })

  it("creates an editable WhatsApp support message without sensitive data", () => {
    const url = whatsappUrl("PAY-CA761232", "Pembayaran ditolak")
    expect(url).toContain("https://wa.me/62882006282613")
    expect(decodeURIComponent(url)).toContain("PAY-CA761232")
    expect(decodeURIComponent(url)).toContain("Pembayaran ditolak")
  })
})
