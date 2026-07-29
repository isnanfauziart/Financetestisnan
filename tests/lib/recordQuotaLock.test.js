import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()
const getSheetData = vi.fn()

vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { rpc } }))
vi.mock("@/lib/sheets", () => ({ getSheetData }))

const auth = {
  user: { id: "user-1" },
  tier: "free",
  isAdmin: false,
  entitlementVerified: true,
  accessToken: "token",
  spreadsheetId: "sheet",
}

describe("record creation lock", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ data: true, error: null })
    getSheetData.mockResolvedValue([["ID"], ["one"]])
  })

  it("holds a lock across count and creation, then releases it", async () => {
    const { runRecordCreation } = await import("@/lib/recordQuota")
    const create = vi.fn(async () => Response.json({ success: true }))
    const response = await runRecordCreation(auth, "debts", {}, create)

    expect(response.status).toBe(200)
    expect(create).toHaveBeenCalledOnce()
    expect(rpc.mock.calls.map(call => call[0])).toEqual([
      "claim_feature_creation",
      "release_feature_creation",
    ])
    expect(rpc.mock.calls[1][1].p_lock_token).toBe(rpc.mock.calls[0][1].p_lock_token)
  })

  it("rejects a concurrent creation while another lease is held", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })
    const { runRecordCreation } = await import("@/lib/recordQuota")
    const create = vi.fn()
    const response = await runRecordCreation(auth, "goals", {}, create)

    expect(response.status).toBe(409)
    expect(response.headers.get("Retry-After")).toBe("2")
    await expect(response.json()).resolves.toMatchObject({
      code: "FEATURE_CREATION_BUSY",
      retryable: true,
    })
    expect(create).not.toHaveBeenCalled()
  })

  it("releases the lock when creation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { runRecordCreation } = await import("@/lib/recordQuota")
    await expect(runRecordCreation(auth, "bills", {}, async () => {
      throw new Error("write failed")
    })).rejects.toThrow("write failed")
    expect(rpc.mock.calls.at(-1)[0]).toBe("release_feature_creation")
  })

  it("bypasses locks and counts for paid/admin users", async () => {
    const { runRecordCreation } = await import("@/lib/recordQuota")
    const response = await runRecordCreation({ ...auth, tier: "paid" }, "goals", {}, async () => Response.json({ success: true }))

    expect(response.status).toBe(200)
    expect(rpc).not.toHaveBeenCalled()
    expect(getSheetData).not.toHaveBeenCalled()
  })

  it("fails closed before locking when entitlement is unverifiable", async () => {
    const { runRecordCreation } = await import("@/lib/recordQuota")
    const response = await runRecordCreation({ ...auth, entitlementVerified: false }, "goals", {}, vi.fn())

    expect(response.status).toBe(503)
    expect(rpc).not.toHaveBeenCalled()
  })
})
