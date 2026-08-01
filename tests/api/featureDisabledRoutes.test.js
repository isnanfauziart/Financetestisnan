import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthContext = vi.fn()

vi.mock("@/lib/apiAuth", () => ({ getAuthContext }))

describe("disabled feature API enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["transactions", "@/app/api/transaction/route", "POST", { tanggal: "2026-08-01", kategori: "Makan", jumlah: 1000 }],
    ["budgets", "@/app/api/budgets/route", "GET"],
    ["bills", "@/app/api/bills/route", "GET"],
  ])("blocks %s route with a stable unavailable response", async (feature, modulePath, method, body) => {
    getAuthContext.mockResolvedValue({ user: { id: "u1" }, featureAccess: { [feature]: false } })
    const route = await import(modulePath)
    const response = await route[method](new Request(`http://localhost/api/${feature}`, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ error: "FEATURE_DISABLED", feature })
  })
})
