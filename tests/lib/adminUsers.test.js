import { describe, expect, it } from "vitest"
import {
  activityCutoff,
  adminEmailSet,
  directoryUser,
  paymentMetadata,
  transactionUsage,
} from "@/lib/adminUsers"

describe("admin user formatting", () => {
  it("normalizes admin email matching and hides spreadsheet identifiers", () => {
    const admins = adminEmailSet([{ email: " Admin@Example.com " }])
    const user = directoryUser({
      id: "u1",
      email: "admin@example.com",
      name: "Admin",
      avatar_url: "avatar",
      tier: "free",
      created_at: "2026-08-01T00:00:00.000Z",
      last_seen_at: null,
      spreadsheet_id: "secret-sheet",
    }, admins)

    expect(user).toEqual(expect.objectContaining({ isAdmin: true, sheetConnected: true }))
    expect(user).not.toHaveProperty("spreadsheet_id")
  })

  it("calculates activity cutoffs in UTC from the supplied instant", () => {
    expect(activityCutoff("24h", new Date("2026-08-02T12:00:00.000Z"))).toBe("2026-08-01T12:00:00.000Z")
    expect(activityCutoff("never", new Date("2026-08-02T12:00:00.000Z"))).toBeNull()
  })

  it("returns an allowlisted payment record with only a proof boolean", () => {
    const result = paymentMetadata({
      id: "payment-1",
      amount: 40000,
      status: "approved",
      created_at: "2026-08-01T00:00:00.000Z",
      proof_url: "private/path.png",
      reviewed_by: "admin@example.com",
    })

    expect(result).toEqual(expect.objectContaining({
      reference: "PAY-PAYMENT1",
      amount: 40000,
      hasProof: true,
    }))
    expect(result).not.toHaveProperty("proof_url")
  })

  it("shows a null limit for Pro transaction usage", () => {
    expect(transactionUsage({
      tier: "paid",
      period: "2026-08",
      count: 120,
      resetAt: "2026-09-01T00:00:00+07:00",
    })).toEqual({ period: "2026-08", current: 120, limit: null, resetAt: null, verified: true })
  })
})
