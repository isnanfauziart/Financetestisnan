import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({
  getAuthContext: vi.fn(),
}))

vi.mock("@/lib/sheets", async () => {
  const actual = await vi.importActual("@/lib/sheets")
  return {
    ...actual,
    getSheetData: vi.fn(),
  }
})

function transactionRow({ id, month, year, amount, category = "Lainnya" }) {
  return [
    `15 ${month} ${year}`,
    id,
    id,
    category,
    amount,
    0,
    0,
    "BCA",
    amount,
    "",
    month,
    year,
    "",
    "",
    "",
  ]
}

const sheetRows = {
  Pemasukan: [
    [],
    transactionRow({ id: "income-old", month: "Apr", year: "2026", amount: 1_000_000 }),
    transactionRow({ id: "income-edge", month: "Mei", year: "2026", amount: 2_000_000 }),
    transactionRow({ id: "income-current", month: "Agu", year: "2026", amount: 3_000_000 }),
  ],
  Pengeluaran: [
    [],
    transactionRow({ id: "expense-old", month: "Apr", year: "2026", amount: 400_000, category: "Belanja" }),
    transactionRow({ id: "expense-visible", month: "Jun", year: "2026", amount: 500_000, category: "Makan" }),
  ],
  Tabungan: [
    [],
    transactionRow({ id: "saving-visible", month: "Jul", year: "2026", amount: 600_000, category: "Tabungan Cash" }),
  ],
}

async function loadDashboard(tier) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-08-15T02:00:00.000Z"))

  const { getAuthContext } = await import("@/lib/apiAuth")
  const { getSheetData } = await import("@/lib/sheets")
  getAuthContext.mockResolvedValue({
    user: { id: "user-1" },
    accessToken: "token",
    spreadsheetId: "sheet-1",
    tier,
    isAdmin: tier === "paid",
    entitlementVerified: true,
  })
  getSheetData.mockImplementation(async (_token, range) => {
    const tab = range.split("!")[0]
    return sheetRows[tab] || []
  })

  const { GET } = await import("@/app/api/dashboard/route")
  const response = await GET(new Request("http://localhost/api/dashboard"))
  return { response, body: await response.json() }
}

describe("/api/dashboard history gating", () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("filters Free rows before all transaction-derived aggregates", async () => {
    const { response, body } = await loadDashboard("free")

    expect(response.status).toBe(200)
    expect(body.transactions.map(transaction => transaction.id).sort()).toEqual([
      "expense-visible",
      "income-current",
      "income-edge",
      "saving-visible",
    ])
    expect(body.totalIncome).toBe(5_000_000)
    expect(body.totalExpense).toBe(500_000)
    expect(body.totalSavings).toBe(600_000)
    expect(body.monthlyData.map(item => `${item.month}-${item.year}`)).toEqual([
      "Mei-2026",
      "Jun-2026",
      "Jul-2026",
      "Agu-2026",
    ])
    expect(body.categories).toEqual([{ name: "Makan", value: 500_000 }])
    expect(body.history).toEqual({
      months: 4,
      from: "2026-05-01",
      to: "2026-08-31",
      limited: true,
      hasOlderData: true,
    })
  })

  it("passes all rows through for paid/admin access", async () => {
    const { response, body } = await loadDashboard("paid")

    expect(response.status).toBe(200)
    expect(body.transactions).toHaveLength(6)
    expect(body.totalIncome).toBe(6_000_000)
    expect(body.totalExpense).toBe(900_000)
    expect(body.history).toEqual({
      months: null,
      from: null,
      to: null,
      limited: false,
      hasOlderData: false,
    })
  })
})
