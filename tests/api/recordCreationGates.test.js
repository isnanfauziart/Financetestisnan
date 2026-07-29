import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(async () => ({
    user: { id: "user-1" },
    accessToken: "token",
    spreadsheetId: "sheet",
    tier: "free",
    isAdmin: false,
    entitlementVerified: true,
  })),
}))

vi.mock("@/lib/recordQuota", () => ({
  runRecordCreation: vi.fn(async (_auth, feature) => Response.json({
    code: "FEATURE_LIMIT_REACHED",
    feature,
  }, { status: 403 })),
}))

describe("record creation route gates", () => {
  beforeEach(() => vi.clearAllMocks())

  const cases = [
    ["goals", "@/app/api/goals/route", { nama: "Dana", target: 1000, deadline: "2026-12-01", kategori: "Dana Darurat" }],
    ["debts", "@/app/api/debts/route", { namaOrang: "Budi", jumlah: 1000, arah: "utang", jatuhTempo: "2026-12-01" }],
    ["bills", "@/app/api/bills/route", { nama: "Listrik", jumlah: 1000, tipe: "expense", kategoriBill: "Utilitas", kategoriTransaksi: "Tagihan", frekuensi: "monthly", tanggalJatuhTempo: 10 }],
    ["momental", "@/app/api/momental/route", { nama: "Lebaran", tanggalMulai: "2026-03-01", tanggalSelesai: "2026-03-20", totalBudget: 1000 }],
  ]

  for (const [feature, modulePath, body] of cases) {
    it(`gates ${feature} POST creation`, async () => {
      const { POST } = await import(modulePath)
      const response = await POST(new Request(`http://localhost/api/${feature}`, {
        method: "POST",
        body: JSON.stringify(body),
      }))
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toMatchObject({ feature })
    })
  }

  it("gates budgets for the requested period", async () => {
    const { runRecordCreation } = await import("@/lib/recordQuota")
    const { POST } = await import("@/app/api/budgets/route")
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ values: [["Kategori", "Bulan", "Tahun"]] }), { status: 200 }))
    const response = await POST(new Request("http://localhost/api/budgets", {
      method: "POST",
      body: JSON.stringify({ kategori: "Makan", bulan: "Jul", tahun: "2026", limit: 1000 }),
    }))
    expect(response.status).toBe(403)
    expect(runRecordCreation).toHaveBeenCalledWith(expect.anything(), "budgets", {
      month: "Jul",
      year: "2026",
    }, expect.any(Function))
  })

  it("keeps the account column when detecting a duplicate budget under the lock", async () => {
    const { runRecordCreation } = await import("@/lib/recordQuota")
    runRecordCreation.mockImplementationOnce(async (_auth, _feature, _options, create) => create([
      ["Kategori", "Bulan", "Tahun", "Limit", "Akun", "Catatan"],
      ["Makan", "Jul", "2026", 1000, "BCA", ""],
    ]))
    const { POST } = await import("@/app/api/budgets/route")
    const response = await POST(new Request("http://localhost/api/budgets", {
      method: "POST",
      body: JSON.stringify({ kategori: "Makan", bulan: "Jul", tahun: "2026", limit: 1500, akun: "BCA" }),
    }))

    expect(response.status).toBe(409)
  })
})
