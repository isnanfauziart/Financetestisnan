import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/apiAuth", () => ({ getAuthContext: vi.fn() }))
vi.mock("@/lib/sheets", async () => {
  const actual = await vi.importActual("@/lib/sheets")
  return { ...actual, getSheetData: vi.fn() }
})

const CHECKPOINT_ID = "1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c"
const OLD_CHECKPOINT_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d"

/**
 * Ledger row for `Pemasukan`/`Pengeluaran`: A date, B id, C desc, D category,
 * E amount, H account, I net, K month, L year, then movement metadata.
 */
function ledgerRow({ id, tanggal, month, year, amount, category = "Lainnya", kind = "", checkpointId = "", sifat = "", type = "income" }) {
  const row = new Array(24).fill("")
  row[0] = tanggal
  row[1] = id
  row[2] = id
  row[3] = category
  row[4] = amount
  row[7] = "BCA"
  row[8] = amount
  row[10] = month
  row[11] = year
  if (type === "expense") row[15] = sifat
  const kindIndex = type === "expense" ? 18 : 17
  const checkpointIndex = type === "expense" ? 16 : 15
  row[kindIndex] = kind
  row[checkpointIndex] = checkpointId
  return row
}

function savingsRow({ id, month, year, amount, category = "Tabungan Likuid", goalId = "", status = "", remaining = "" }) {
  const row = new Array(21).fill("")
  row[0] = `10 ${month} ${year}`
  row[1] = id
  row[2] = id
  row[3] = category
  row[4] = amount
  row[7] = "BCA"
  row[8] = amount
  row[10] = month
  row[11] = year
  row[15] = goalId
  row[16] = status
  row[17] = remaining
  return row
}

function debtRow({ id, arah, status, remaining }) {
  const row = new Array(13).fill("")
  row[0] = id
  row[1] = "Budi"
  row[2] = 1_000_000
  row[3] = arah
  row[4] = "2026-12-31"
  row[5] = status
  row[6] = remaining
  return row
}

// Stored categories must satisfy `normalizeCategories`: name, icon, active.
const CATEGORIES_JSON = JSON.stringify({
  expense: [{ name: "Makan", icon: "Wallet", active: true }],
  income: [{ name: "Gaji", icon: "Wallet", active: true }],
  savings: [
    { name: "Tabungan Likuid", icon: "Wallet", active: true, savingsKind: "liquid" },
    { name: "Reksadana", icon: "Wallet", active: true, savingsKind: "investment" },
  ],
})

async function loadDashboard({
  tier = "paid",
  income = [],
  expense = [],
  savings = [],
  debts = [],
  settings = [],
  bills = [],
} = {}) {
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
  const rowsByTab = {
    Pemasukan: [["header"], ...income],
    Pengeluaran: [["header"], ...expense],
    Tabungan: [["header"], ...savings],
    Utang: [["header"], ...debts],
    Tagihan: [["header"], ...bills],
    Settings: settings,
  }
  getSheetData.mockImplementation(async (_token, range) => rowsByTab[range.split("!")[0]] || [])

  const { GET } = await import("@/app/api/dashboard/route")
  const response = await GET(new Request("http://localhost/api/dashboard"))
  return { response, body: await response.json() }
}

afterEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("dashboard canonical balances", () => {
  it("falls back to the latest recorded balance and labels it provisional", async () => {
    const { body } = await loadDashboard({
      income: [ledgerRow({ id: "in-1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 3_000_000 })],
      expense: [ledgerRow({ id: "ex-1", tanggal: "6 Agu 2026", month: "Agu", year: "2026", amount: 500_000, type: "expense", sifat: "Rutin" })],
      settings: [["startingBalance", "1000000"], ["startingBalanceDate", "2026-01-01"]],
    })

    expect(body.balances.currentCash).toMatchObject({ value: 3_500_000, provisional: true, checkpointId: "" })
    expect(body.balances.recordedBalance).toBe(3_500_000)
    expect(body.balances.available.value).toBe(3_500_000)
  })

  it("keeps a confirmed Rp0 balance distinct from incomplete setup", async () => {
    const { body } = await loadDashboard({
      settings: [
        ["startingBalance", "0"],
        ["startingBalanceConfirmed", "true"],
        ["currentCashBalance", "0"],
        ["currentCashBalanceCheckpointId", CHECKPOINT_ID],
      ],
    })

    expect(body.balances.startingBalanceConfirmed).toBe(true)
    expect(body.balances.currentCash).toMatchObject({ value: 0, provisional: false, checkpointId: CHECKPOINT_ID })
  })

  it("applies only movements carrying the active checkpoint id", async () => {
    const { body } = await loadDashboard({
      income: [
        // Same day as the checkpoint, but recorded before it → excluded.
        ledgerRow({ id: "in-before", tanggal: "15 Agu 2026", month: "Agu", year: "2026", amount: 900_000, checkpointId: OLD_CHECKPOINT_ID }),
        ledgerRow({ id: "in-after", tanggal: "15 Agu 2026", month: "Agu", year: "2026", amount: 900_000, checkpointId: CHECKPOINT_ID }),
      ],
      expense: [
        ledgerRow({ id: "ex-after", tanggal: "15 Agu 2026", month: "Agu", year: "2026", amount: 400_000, type: "expense", sifat: "Rutin", checkpointId: CHECKPOINT_ID }),
        ledgerRow({ id: "ex-before", tanggal: "15 Agu 2026", month: "Agu", year: "2026", amount: 400_000, type: "expense", sifat: "Rutin", checkpointId: OLD_CHECKPOINT_ID }),
      ],
      settings: [
        ["currentCashBalance", "1000000"],
        ["currentCashBalanceCheckpointId", CHECKPOINT_ID],
        ["currentCashBalanceRecordedAt", "2026-08-15T01:00:00.000Z"],
      ],
    })

    expect(body.balances.currentCash.value).toBe(1_500_000)
    expect(body.balances.currentCash.adjustment).toBe(500_000)
  })

  it("uses the unfiltered rows for balances while Free browsing stays windowed", async () => {
    const { body } = await loadDashboard({
      tier: "free",
      income: [
        ledgerRow({ id: "in-old", tanggal: "5 Apr 2026", month: "Apr", year: "2026", amount: 7_000_000 }),
        ledgerRow({ id: "in-new", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 1_000_000 }),
      ],
    })

    expect(body.transactions.map(transaction => transaction.id)).toEqual(["in-new"])
    expect(body.history.hasOlderData).toBe(true)
    expect(body.balances.recordedBalance).toBe(8_000_000)
    expect(body.monthlyData.map(item => item.month)).toEqual(["Agu"])
  })

  it("subtracts only liquid reservations from available funds", async () => {
    const { body } = await loadDashboard({
      income: [ledgerRow({ id: "in-1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 })],
      savings: [
        savingsRow({ id: "sv-1", month: "Agu", year: "2026", amount: 1_000_000, goalId: "g1", status: "allocated", remaining: 1_000_000 }),
        savingsRow({ id: "sv-2", month: "Agu", year: "2026", amount: 800_000 }),
        savingsRow({ id: "sv-3", month: "Agu", year: "2026", amount: 2_000_000, category: "Reksadana" }),
      ],
      settings: [
        ["startingBalance", "1000000"],
        ["startingBalanceDate", "2026-01-01"],
        ["categories_v1", CATEGORIES_JSON],
      ],
    })

    expect(body.balances.allocations).toMatchObject({
      liquidAssigned: 1_000_000,
      liquidUnassigned: 800_000,
      investmentReserved: 2_000_000,
      reservedTotal: 1_800_000,
    })
    // Recorded balance ignores savings entirely: the money was already owned.
    expect(body.balances.recordedBalance).toBe(6_000_000)
    expect(body.balances.available.value).toBe(4_200_000)
  })

  it("treats unknown legacy savings classifications as an estimate", async () => {
    const { body } = await loadDashboard({
      income: [ledgerRow({ id: "in-1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 })],
      savings: [savingsRow({ id: "sv-1", month: "Agu", year: "2026", amount: 1_000_000, category: "Tabungan Misterius" })],
      settings: [["categories_v1", CATEGORIES_JSON]],
    })

    expect(body.balances.rincian).toMatchObject({ estimate: true, needsReviewCount: 1, needsReviewTotal: 1_000_000 })
    expect(body.balances.allocations.reservedTotal).toBe(0)
    expect(body.balances.available.value).toBe(5_000_000)
  })

  it("adds outstanding receivables and subtracts outstanding debts from net worth", async () => {
    const { body } = await loadDashboard({
      income: [ledgerRow({ id: "in-1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 })],
      debts: [
        debtRow({ id: "d-1", arah: "utang", status: "open", remaining: 2_000_000 }),
        debtRow({ id: "d-2", arah: "piutang", status: "open", remaining: 500_000 }),
        debtRow({ id: "d-3", arah: "utang", status: "settled", remaining: 9_000_000 }),
      ],
    })

    expect(body.netWorth).toBe(3_500_000)
    expect(body.balances.outstanding).toMatchObject({ utang: 2_000_000, piutang: 500_000 })
    // Debts change what the user owns, not the cash they can spend right now.
    expect(body.balances.available.value).toBe(5_000_000)
  })

  it("keeps unpaid bills informational and counts paid ones as spending", async () => {
    const unpaid = await loadDashboard({
      income: [ledgerRow({ id: "in-1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 })],
      bills: [[
        "b-1", "Listrik", 300_000, "expense", "Listrik", "Tagihan", "bulanan", "2026-08-20", "BCA", "true", "", "", "",
      ]],
    })

    expect(unpaid.body.balances.available.value).toBe(5_000_000)
    expect(unpaid.body.balances.rincian.unpaidBills.total).toBe(300_000)

    const paid = await loadDashboard({
      income: [ledgerRow({ id: "in-1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 })],
      expense: [ledgerRow({ id: "bill:1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 300_000, type: "expense", sifat: "Rutin" })],
      bills: [[
        "b-1", "Listrik", 300_000, "expense", "Listrik", "Tagihan", "bulanan", "2026-08-20", "BCA", "true", "2026-08-05", "", "",
      ]],
    })

    expect(paid.body.balances.available.value).toBe(4_700_000)
  })
})

describe("dashboard movement classification", () => {
  it("counts loan principal in Uang masuk and Uang keluar but not in routine spending", async () => {
    const { body } = await loadDashboard({
      income: [
        ledgerRow({ id: "in-salary", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 }),
        ledgerRow({ id: "loan-in", tanggal: "6 Agu 2026", month: "Agu", year: "2026", amount: 10_000_000, category: "Utang", kind: "debt_principal_in" }),
      ],
      expense: [
        ledgerRow({ id: "ex-makan", tanggal: "7 Agu 2026", month: "Agu", year: "2026", amount: 1_000_000, category: "Makan", type: "expense", sifat: "Rutin", kind: "operational_expense" }),
        ledgerRow({ id: "loan-out", tanggal: "8 Agu 2026", month: "Agu", year: "2026", amount: 2_000_000, category: "Utang", type: "expense", sifat: "Rutin", kind: "debt_principal_out" }),
      ],
    })

    expect(body.monthlyData[0]).toMatchObject({ pemasukan: 15_000_000, pengeluaran: 3_000_000, surplus: 12_000_000 })
    expect(body.routineMonthlyData[0]).toMatchObject({
      pemasukan: 5_000_000,
      pengeluaranRutin: 1_000_000,
      pengeluaranAktual: 1_000_000,
      surplusRutin: 4_000_000,
    })
    expect(body.categories).toEqual([{ name: "Makan", value: 1_000_000 }])
  })

  it("excludes operational expenses from the canonical balance far more strictly than from cash", async () => {
    const { body } = await loadDashboard({
      income: [ledgerRow({ id: "in-salary", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 })],
      expense: [
        ledgerRow({ id: "ex-rutin", tanggal: "6 Agu 2026", month: "Agu", year: "2026", amount: 1_000_000, category: "Makan", type: "expense", sifat: "Rutin", kind: "operational_expense" }),
        ledgerRow({ id: "ex-spesial", tanggal: "6 Agu 2026", month: "Agu", year: "2026", amount: 3_000_000, category: "Laptop", type: "expense", sifat: "Spesial", kind: "operational_expense" }),
      ],
    })

    // Both classes are real spending for balances and for actual totals.
    expect(body.routineMonthlyData[0].pengeluaranSpesial).toBe(3_000_000)
    expect(body.balances.currentCash.value).toBe(1_000_000)
    expect(body.totalExpense).toBe(4_000_000)
  })

  it("records a goal-funded expense as cash leaving and does not change recorded savings twice", async () => {
    const { body } = await loadDashboard({
      income: [ledgerRow({ id: "in-1", tanggal: "5 Agu 2026", month: "Agu", year: "2026", amount: 5_000_000 })],
      expense: [ledgerRow({ id: "goal-1", tanggal: "9 Agu 2026", month: "Agu", year: "2026", amount: 700_000, category: "Jajan", type: "expense", sifat: "Rutin", kind: "goal_funded_expense" })],
      savings: [savingsRow({ id: "sv-1", month: "Agu", year: "2026", amount: 1_000_000, goalId: "g1", status: "allocated", remaining: 300_000 })],
      settings: [["categories_v1", CATEGORIES_JSON]],
    })

    expect(body.balances.recordedBalance).toBe(4_300_000)
    expect(body.balances.allocations.liquidAssigned).toBe(300_000)
    expect(body.balances.available.value).toBe(4_000_000)
  })
})
