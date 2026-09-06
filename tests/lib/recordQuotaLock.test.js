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

  it("serializes unlimited batch creation when requested", async () => {
    const { runRecordCreations } = await import("@/lib/recordQuota")
    const create = vi.fn(async () => Response.json({ success: true }))
    const response = await runRecordCreations({ ...auth, tier: "paid" }, "budgets", {}, 4, create, { serializeUnlimited: true })

    expect(response.status).toBe(200)
    expect(create).toHaveBeenCalledWith(null)
    expect(rpc.mock.calls.map(call => call[0])).toEqual([
      "claim_feature_creation",
      "release_feature_creation",
    ])
    expect(getSheetData).not.toHaveBeenCalled()
  })

  it("rejects an unlimited batch when another unlimited creation holds the lock", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })
    const { runRecordCreations } = await import("@/lib/recordQuota")
    const create = vi.fn()
    const response = await runRecordCreations({ ...auth, tier: "paid" }, "budgets", {}, 2, create, { serializeUnlimited: true })

    expect(response.status).toBe(409)
    expect(create).not.toHaveBeenCalled()
  })

  it("fails closed before locking when entitlement is unverifiable", async () => {
    const { runRecordCreation } = await import("@/lib/recordQuota")
    const response = await runRecordCreation({ ...auth, entitlementVerified: false }, "goals", {}, vi.fn())

    expect(response.status).toBe(503)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("rejects a batch when the complete count would exceed the Free period quota", async () => {
    getSheetData.mockResolvedValue([
      ["Kategori", "Bulan", "Tahun"],
      ["Makan", "Jul", "2026"],
      ["Transport", "Jul", "2026"],
    ])
    const { runRecordCreations } = await import("@/lib/recordQuota")
    const create = vi.fn()
    const response = await runRecordCreations(auth, "budgets", { month: "Jul", year: "2026" }, 2, create)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: "FEATURE_LIMIT_REACHED",
      feature: "budgets",
      current: 2,
      limit: 3,
    })
    expect(create).not.toHaveBeenCalled()
    expect(rpc.mock.calls.map(call => call[0])).toEqual([
      "claim_feature_creation",
      "release_feature_creation",
    ])
  })

  it("bypasses batch counting for Paid users", async () => {
    const { runRecordCreations } = await import("@/lib/recordQuota")
    const create = vi.fn(async () => Response.json({ copied: 4 }))
    const response = await runRecordCreations({ ...auth, tier: "paid" }, "budgets", {}, 4, create)

    expect(response.status).toBe(200)
    expect(create).toHaveBeenCalledWith(null)
    expect(getSheetData).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("releases the batch lock when creation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { runRecordCreations } = await import("@/lib/recordQuota")

    await expect(runRecordCreations(auth, "budgets", { month: "Jul", year: "2026" }, 2, async () => {
      throw new Error("batch write failed")
    })).rejects.toThrow("batch write failed")

    expect(rpc.mock.calls.at(-1)[0]).toBe("release_feature_creation")
  })
})
