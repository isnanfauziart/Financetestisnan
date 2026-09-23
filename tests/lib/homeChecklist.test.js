import { describe, expect, it } from "vitest"
import { BUDGET_WARNING_PCT, buildChecklistActions } from "@/lib/homeChecklist"

const NOW = new Date(2026, 8, 22) // fixed "now": Sep 2026

const overdueBill = {
  id: "bill-1",
  nama: "Internet WiFi",
  status: "overdue",
  daysUntilDue: -3,
  jumlah: 350000,
}

const budget95 = {
  kategori: "Makanan",
  limit: 1000000,
  bulan: "Jul",
  tahun: "2026",
  akun: "",
}

const txJul = (amount) => ({
  type: "expense",
  category: "Makanan",
  amount,
  month: "Jul",
  year: "2026",
  account: "BCA",
})

const behindGoal = {
  id: "g1",
  nama: "Laptop",
  target: 12000000,
  deadline: "2026-12",
  createdAt: "2020-01",
}

const anomalies = [
  { category: "Kopi", current: 300000, avg: 100000, ratio: 3, severity: "critical" },
  { category: "Transport", current: 150000, avg: 100000, ratio: 1.5, severity: "high" },
]

const base = {
  bills: [],
  budgets: [],
  allTransactions: [],
  month: "Jul",
  year: "2026",
  goals: [],
  allocations: null,
  anomalies: [],
  anomalyEnabled: false,
}

describe("buildChecklistActions priority (Wave 6)", () => {
  it("exposes the established 80% budget warning threshold", () => {
    expect(BUDGET_WARNING_PCT).toBe(80)
  })

  it("orders overdue bill, budget, goal, then anomaly and caps at two", () => {
    const items = buildChecklistActions({
      ...base,
      bills: [overdueBill],
      budgets: [budget95],
      allTransactions: [txJul(950000)],
      goals: [behindGoal],
      allocations: { byGoal: { g1: { remaining: 100000 } } },
      anomalies,
      anomalyEnabled: true,
    }, NOW)

    expect(items).toHaveLength(2)
    expect(items[0].kind).toBe("bill")
    expect(items[1].kind).toBe("budget")
  })

  it("never lists bills that are only due today or due soon", () => {
    const items = buildChecklistActions({
      ...base,
      bills: [
        { ...overdueBill, status: "due_today", daysUntilDue: 0 },
        { ...overdueBill, id: "bill-2", status: "due_soon", daysUntilDue: 2 },
      ],
    }, NOW)
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe("quickAdd")
  })

  it("picks the most overdue bill first", () => {
    const items = buildChecklistActions({
      ...base,
      bills: [
        { ...overdueBill, id: "a", daysUntilDue: -1 },
        { ...overdueBill, id: "b", daysUntilDue: -9 },
      ],
    }, NOW)
    expect(items[0].key).toBe("bill-b")
  })
})

describe("buildChecklistActions categories (Wave 6)", () => {
  it("lists a budget at the warning threshold and escalates past 100%", () => {
    const atThreshold = buildChecklistActions({
      ...base,
      budgets: [budget95],
      allTransactions: [txJul(800000)], // 80%
    }, NOW)
    expect(atThreshold[0]).toMatchObject({ kind: "budget", eyebrow: "Budget menipis" })

    const overLimit = buildChecklistActions({
      ...base,
      budgets: [budget95],
      allTransactions: [txJul(1200000)], // 120%
    }, NOW)
    expect(overLimit[0]).toMatchObject({ kind: "budget", eyebrow: "Budget jebol" })
  })

  it("ignores budgets below the warning threshold", () => {
    const items = buildChecklistActions({
      ...base,
      budgets: [budget95],
      allTransactions: [txJul(790000)], // 79%
    }, NOW)
    expect(items[0].kind).toBe("quickAdd")
  })

  it("breaks equal budget percentages deterministically", () => {
    const a = { ...budget95, kategori: "Buah" }
    const b = { ...budget95, kategori: "Anggur" }
    const items = buildChecklistActions({
      ...base,
      budgets: [a, b],
      allTransactions: [
        { ...txJul(900000), category: "Anggur" },
        { ...txJul(900000), category: "Buah" },
      ],
    }, NOW)
    expect(items[0].key).toContain("Anggur")
  })

  it("lists only goals behind pace, worst shortfall first", () => {
    const worseGoal = {
      id: "g2",
      nama: "Dana darurat",
      target: 60000000,
      deadline: "2026-12",
      createdAt: "2020-01",
    }
    const onTrackGoal = {
      id: "g3",
      nama: "Liburan",
      target: 100000,
      deadline: "2026-10",
      createdAt: "2026-09",
    }
    const items = buildChecklistActions({
      ...base,
      goals: [behindGoal, worseGoal, onTrackGoal],
      allocations: {
        byGoal: {
          g1: { remaining: 100000 },
          g2: { remaining: 1000000 },
          g3: { remaining: 90000 },
        },
      },
    }, NOW)

    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe("goal")
    expect(items[0].key).toBe("goal-g2") // biggest monthly shortfall first
    expect(items[0].destination).toMatchObject({ tab: "plan", section: "goal", goalId: "g2" })
  })

  it("offers anomaly evidence only with the entitlement, worst ratio first", () => {
    const gated = buildChecklistActions({ ...base, anomalies, anomalyEnabled: false }, NOW)
    expect(gated.map(item => item.kind)).toEqual(["quickAdd"])

    const enabled = buildChecklistActions({ ...base, anomalies, anomalyEnabled: true }, NOW)
    expect(enabled[0]).toMatchObject({ kind: "anomaly" })
    expect(enabled[0].destination).toEqual({ tab: "stats", section: "ringkasan", category: "Kopi" })
  })
})

describe("buildChecklistActions destinations and fallback (Wave 6)", () => {
  it("routes the bill item to the valid bill section key", () => {
    const items = buildChecklistActions({ ...base, bills: [overdueBill] }, NOW)
    expect(items[0].destination).toMatchObject({ tab: "plan", section: "bill" })
    expect(items[0].destination.section).not.toBe("tagihan")
  })

  it("falls back to the compact Tambah transaksi prompt when nothing qualifies", () => {
    const items = buildChecklistActions(base, NOW)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: "quickAdd",
      title: "Tambah transaksi hari ini",
      destination: { action: "quickAdd", txType: "expense" },
    })
  })

  it("treats loading or failed sources as no candidates without throwing", () => {
    const items = buildChecklistActions({
      bills: undefined,
      budgets: undefined,
      allTransactions: undefined,
      goals: undefined,
      allocations: undefined,
      anomalies: undefined,
    }, NOW)
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe("quickAdd")
  })
})
