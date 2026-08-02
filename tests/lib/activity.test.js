import { describe, expect, it, vi } from "vitest"

const supabaseMock = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: supabaseMock }))

import { recordAuthenticatedActivity, shouldRecordActivity } from "@/lib/activity"

describe("authenticated activity", () => {
  it("records first authenticated activity", () => {
    expect(shouldRecordActivity(null, new Date("2026-08-02T00:00:00.000Z"))).toBe(true)
  })

  it("does not record activity again inside the five-minute window", () => {
    expect(shouldRecordActivity(
      "2026-08-02T00:00:00.000Z",
      new Date("2026-08-02T00:04:59.000Z")
    )).toBe(false)
  })

  it("records activity at the five-minute boundary", () => {
    expect(shouldRecordActivity(
      "2026-08-02T00:00:00.000Z",
      new Date("2026-08-02T00:05:00.000Z")
    )).toBe(true)
  })

  it("treats an invalid stored timestamp as not recorded", () => {
    expect(shouldRecordActivity("not-a-date", new Date("2026-08-02T00:00:00.000Z"))).toBe(true)
  })

  it("writes a first activity timestamp with a null optimistic guard", async () => {
    const now = new Date("2026-08-02T00:00:00.000Z")
    const builder = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      is: vi.fn(() => builder),
      select: vi.fn(() => builder),
      maybeSingle: vi.fn().mockResolvedValue({ data: { last_seen_at: now.toISOString() }, error: null }),
    }
    supabaseMock.from.mockReturnValue(builder)

    await expect(recordAuthenticatedActivity("user-1", null, now)).resolves.toBe(now.toISOString())
    expect(builder.update).toHaveBeenCalledWith({ last_seen_at: now.toISOString() })
    expect(builder.eq).toHaveBeenCalledWith("id", "user-1")
    expect(builder.is).toHaveBeenCalledWith("last_seen_at", null)
  })

  it("skips the Supabase write inside the five-minute window", async () => {
    supabaseMock.from.mockClear()

    await expect(recordAuthenticatedActivity(
      "user-1",
      "2026-08-02T00:00:00.000Z",
      new Date("2026-08-02T00:04:59.000Z")
    )).resolves.toBeNull()
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })
})
