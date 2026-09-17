import { describe, expect, it } from "vitest"

import {
  buildCashFlow,
  buildMonthlySeries,
  buildMovements,
  computeAvailableFunds,
  computeBalances,
  computeCurrentCash,
  computeDebtTotals,
  computeRecordedBalance,
  computeUnpaidBills,
} from "@/lib/balances"
import { MOVEMENT_KINDS, deriveLegacyMovementKind, resolveMovementKind, sheetMonthKey } from "@/lib/movement"
import { resolveCheckpoint } from "@/lib/checkpoint"
import { savingsCategoryKinds } from "@/lib/savingsAllocation"

const HEADER = ["Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net", "Catatan", "M", "Y", "Y2", "EventID", "EventSubKategori"]
const EXPENSE_HEADER = [...HEADER, "Sifat"]
const SAVINGS_HEADER = [...HEADER, "GoalId", "AllocationStatus", "SisaAlokasi", "RecordedAt", "MovementKind", "RelatedRecordId"]
const UTANG_HEADER = ["ID", "NamaOrang", "Jumlah", "Arah", "JatuhTempo", "Status", "SisaSaldo", "Catatan", "CreatedAt"]

const CHECKPOINT_ID = "1f0a3a3c-9f2e-4c0d-8a1b-2d3e4f5a6b7c"
const STALE_CHECKPOINT_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d"
const AUGUST = new Date("2026-08-12T03:00:00Z")

const KINDS = savingsCategoryKinds({
  savings: [
    { name: "Tabungan Cash", active: true, savingsKind: "liquid" },
    { name: "Emas", active: true, savingsKind: "investment" },
  ],
})

function txRow({
  id = "in-1",
  desc = "",
  category = "Gaji",
  amount = 0,
  account = "",
  month = "Agu",
  year = "2026",
  eventId = "",
  eventSubKategori = "",
  sifat = "",
  cells = {},
} = {}) {
  const row = new Array(20).fill("")
  row[0] = `1 ${month} ${year}`
  row[1] = id
  row[2] = desc
  row[3] = category
  row[4] = amount
  row[7] = account
  row[8] = amount
  row[10] = month
  row[11] = year
  row[13] = eventId
  row[14] = eventSubKategori
  if (sifat) row[15] = sifat
  for (const [index, value] of Object.entries(cells)) row[Number(index)] = value
  return row
}

function savingsRow({ id = "sv-1", category = "Tabungan Cash", amount = 0, goalId = "", status = "", remaining = "", month = "Agu", year = "2026" } = {}) {
  const row = new Array(21).fill("")
  row[0] = `1 ${month} ${year}`
  row[1] = id
  row[3] = category
  row[4] = amount
  row[8] = amount
  row[10] = month
  row[11] = year
  row[15] = goalId
  row[16] = status
  row[17] = remaining
  return row
}

describe("movement metadata", () => {
  it("keeps loan principal in cash flow but out of analytics", () => {
    const movements = buildMovements({
      incomeRows: [HEADER, txRow({ id: "in-debt", amount: 3_000_000, cells: { 17: MOVEMENT_KINDS.debtPrincipalIn } })],
      expenseRows: [EXPENSE_HEADER, txRow({ id: "ex-debt", category: "Utang", amount: 2_000_000, cells: { 18: MOVEMENT_KINDS.debtPrincipalOut } })],
      categoryKinds: KINDS,
    })

    const principalIn = movements.find(movement => movement.id === "in-debt")
    const principalOut = movements.find(movement => movement.id === "ex-debt")
    expect(principalIn).toMatchObject({ cashDelta: 1, cashFlow: true, operational: false })
    expect(principalOut).toMatchObject({ cashDelta: -1, cashFlow: true, operational: false })
  })

  it("treats a savings allocation as ownership-only", () => {
    const movements = buildMovements({
      savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-1", amount: 500_000 })],
      categoryKinds: KINDS,
    })

    expect(movements[0]).toMatchObject({
      type: "savings",
      kind: MOVEMENT_KINDS.savingsAllocation,
      cashDelta: 0,
      cashFlow: false,
      operational: false,
    })
  })

  it("keeps a goal-funded expense inside operational spending", () => {
    const movements = buildMovements({
      expenseRows: [EXPENSE_HEADER, txRow({ id: "ex-goal", amount: 2_000_000, sifat: "Rutin", cells: { 18: MOVEMENT_KINDS.goalFundedExpense } })],
      categoryKinds: KINDS,
    })

    expect(movements[0]).toMatchObject({ cashDelta: -1, cashFlow: true, operational: true })
  })

  it("reclassifies only rows the debt workflow created", () => {
    expect(deriveLegacyMovementKind({ tab: "Pengeluaran", rowId: "debtpay:5:p1" })).toBe(MOVEMENT_KINDS.debtPrincipalOut)
    expect(deriveLegacyMovementKind({ tab: "Pemasukan", rowId: "debtpay:5:p1" })).toBe(MOVEMENT_KINDS.receivablePrincipalIn)
    expect(deriveLegacyMovementKind({ tab: "Pengeluaran", rowId: "ex-9" })).toBe(MOVEMENT_KINDS.operationalExpense)
    expect(resolveMovementKind({ kind: "unknown_kind", tab: "Pemasukan", rowId: "in-1" })).toBe(MOVEMENT_KINDS.operationalIncome)
    expect(resolveMovementKind({ kind: MOVEMENT_KINDS.debtPrincipalIn, tab: "Pemasukan", rowId: "in-1" })).toBe(MOVEMENT_KINDS.debtPrincipalIn)
  })

  it("leaves a manually recorded Utang expense in analytics", () => {
    const movements = buildMovements({
      expenseRows: [EXPENSE_HEADER, txRow({ id: "ex-9", category: "Utang", amount: 100_000 })],
      categoryKinds: KINDS,
    })

    expect(movements[0]).toMatchObject({ kind: MOVEMENT_KINDS.operationalExpense, operational: true })
  })

  it("builds comparable month keys", () => {
    expect(sheetMonthKey("Agu", "2026")).toBe("2026-08")
    expect(sheetMonthKey("Mei", 2026)).toBe("2026-05")
    expect(sheetMonthKey("", "2026")).toBe("")
  })
})

describe("recorded balance", () => {
  it("applies the saldo awal cutoff to every cash movement", () => {
    const movements = buildMovements({
      incomeRows: [
        HEADER,
        txRow({ id: "in-may", amount: 999_000, month: "Mei" }),
        txRow({ id: "in-jul", amount: 500_000, month: "Jul" }),
      ],
      expenseRows: [EXPENSE_HEADER, txRow({ id: "ex-jul", amount: 200_000, month: "Jul" })],
      savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-jul", amount: 400_000, month: "Jul" })],
      categoryKinds: KINDS,
    })

    const recorded = computeRecordedBalance({ startingBalance: 1_000_000, startMonthKey: "2026-06", movements })

    expect(recorded.value).toBe(1_300_000)
    expect(recorded.history.map(entry => [entry.key, entry.value])).toEqual([
      ["2026-05", 1_000_000],
      ["2026-07", 1_300_000],
    ])
  })

  it("ignores savings allocations when accumulating cash", () => {
    const movements = buildMovements({
      savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-1", amount: 5_000_000 })],
      categoryKinds: KINDS,
    })

    expect(computeRecordedBalance({ startingBalance: 1_000_000, movements }).value).toBe(1_000_000)
  })

  it("falls back to the saldo awal when no month has data", () => {
    expect(computeRecordedBalance({ startingBalance: 750_000, movements: [] }).value).toBe(750_000)
  })
})

describe("outstanding debts", () => {
  it("nets piutang against utang and skips settled rows", () => {
    const totals = computeDebtTotals([
      UTANG_HEADER,
      ["1", "Budi", 1_000_000, "utang", "2026-09-01", "open", 600_000, "", "2026-08-01"],
      ["2", "Ani", 500_000, "piutang", "2026-09-01", "open", 500_000, "", "2026-08-01"],
      ["3", "Cici", 300_000, "utang", "2026-09-01", "settled", 300_000, "", "2026-08-01"],
      ["4", "Dodi", 200_000, "piutang", "2026-09-01", "open", 0, "", "2026-08-01"],
    ])

    expect(totals).toMatchObject({ utang: 600_000, piutang: 500_000, netWorthContribution: -100_000, utangCount: 1, piutangCount: 1 })
  })
})

describe("current cash and available funds", () => {
  const movements = buildMovements({
    incomeRows: [
      HEADER,
      txRow({ id: "in-with-checkpoint", amount: 300_000, cells: { 15: CHECKPOINT_ID } }),
      txRow({ id: "in-legacy", amount: 50_000 }),
      txRow({ id: "in-stale", amount: 80_000, cells: { 15: STALE_CHECKPOINT_ID } }),
    ],
    expenseRows: [EXPENSE_HEADER, txRow({ id: "ex-with-checkpoint", amount: 100_000, category: "Makan", cells: { 16: CHECKPOINT_ID } })],
    savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-1", amount: 500_000 })],
    categoryKinds: KINDS,
  })

  it("adjusts only the rows that inherit the active checkpoint", () => {
    const checkpoint = resolveCheckpoint({ balance: 2_000_000, checkpointId: CHECKPOINT_ID, recordedAt: "2026-08-12T02:00:00.000Z" })
    const current = computeCurrentCash({ checkpoint, recordedBalance: 5_000_000, movements })

    expect(current).toMatchObject({ value: 2_200_000, provisional: false, adjustment: 200_000, checkpointId: CHECKPOINT_ID })
  })

  it("does not double count same-day rows recorded before the checkpoint", () => {
    const checkpoint = resolveCheckpoint({ balance: 2_000_000, checkpointId: CHECKPOINT_ID })
    const current = computeCurrentCash({ checkpoint, recordedBalance: 5_000_000, movements })

    // The legacy and stale rows share the month but not the checkpoint.
    expect(current.value).toBe(2_200_000)
  })

  it("uses the latest recorded balance provisionally before a checkpoint exists", () => {
    const current = computeCurrentCash({ checkpoint: resolveCheckpoint({ balance: null, checkpointId: "" }), recordedBalance: 1_750_000, movements })

    expect(current).toMatchObject({ value: 1_750_000, provisional: true, adjustment: 0 })
  })

  it("subtracts reservations without going below zero", () => {
    expect(computeAvailableFunds({ currentCash: 5_000_000, reservations: 2_000_000 })).toEqual({ value: 3_000_000, shortfall: 0, raw: 3_000_000 })
    expect(computeAvailableFunds({ currentCash: 2_000_000, reservations: 3_000_000 })).toEqual({ value: 0, shortfall: 1_000_000, raw: -1_000_000 })
  })

  it("keeps available funds unchanged when a goal-funded expense spends its reservation", () => {
    const before = computeBalances({
      startingBalance: 5_000_000,
      movements: buildMovements({
        savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-1", amount: 2_000_000, goalId: "g1" })],
        categoryKinds: KINDS,
      }),
      categoryKinds: KINDS,
      now: AUGUST,
    })

    const after = computeBalances({
      startingBalance: 5_000_000,
      movements: buildMovements({
        expenseRows: [EXPENSE_HEADER, txRow({ id: "ex-goal", category: "Elektronik", amount: 2_000_000, cells: { 18: MOVEMENT_KINDS.goalFundedExpense } })],
        savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-1", amount: 2_000_000, goalId: "g1", status: "released" })],
        categoryKinds: KINDS,
      }),
      categoryKinds: KINDS,
      now: AUGUST,
    })

    expect(before.available.value).toBe(3_000_000)
    expect(after.available.value).toBe(3_000_000)
  })
})

describe("canonical balance assembly", () => {
  const snapshot = () => ({
    startingBalance: 10_000_000,
    startingBalanceDate: "2026-06-01",
    startingBalanceConfirmed: true,
    debtRows: [
      UTANG_HEADER,
      ["1", "Budi", 1_000_000, "utang", "2026-09-01", "open", 1_000_000, "", "2026-08-01"],
      ["2", "Ani", 400_000, "piutang", "2026-09-01", "open", 400_000, "", "2026-08-01"],
    ],
    movements: buildMovements({
      incomeRows: [HEADER, txRow({ id: "in-1", amount: 8_000_000 })],
      expenseRows: [
        EXPENSE_HEADER,
        txRow({ id: "ex-rutin", category: "Makan", amount: 1_000_000, sifat: "Rutin" }),
        txRow({ id: "ex-spesial", category: "Kondangan", amount: 500_000, sifat: "Spesial" }),
        txRow({ id: "ex-debt", category: "Utang", amount: 2_000_000, cells: { 18: MOVEMENT_KINDS.debtPrincipalOut } }),
      ],
      savingsRows: [
        SAVINGS_HEADER,
        savingsRow({ id: "sv-goal", amount: 1_000_000, goalId: "g1" }),
        savingsRow({ id: "sv-free", amount: 400_000 }),
        savingsRow({ id: "sv-gold", category: "Emas", amount: 2_000_000 }),
        savingsRow({ id: "sv-unknown", category: "Saham Lama", amount: 900_000 }),
      ],
      categoryKinds: KINDS,
    }),
    categoryKinds: KINDS,
    billsSummary: { upcoming: [{ id: "b1" }], overdue: [{ id: "b2" }], totalUpcoming: 300_000, totalOverdue: 150_000, overdueCount: 1 },
    now: AUGUST,
  })

  it("nets outstanding loans into Kekayaan Bersih", () => {
    const balances = computeBalances(snapshot())

    expect(balances.recordedBalance).toBe(14_500_000)
    expect(balances.outstanding).toMatchObject({ utang: 1_000_000, piutang: 400_000 })
    expect(balances.netWorth).toBe(13_900_000)
  })

  it("falls back to the recorded balance with the provisional label", () => {
    const balances = computeBalances({ ...snapshot(), checkpoint: resolveCheckpoint({ balance: null, checkpointId: "" }) })

    expect(balances.currentCash.provisional).toBe(true)
    expect(balances.currentCash.value).toBe(14_500_000)
    expect(balances.available.value).toBe(13_100_000)
  })

  it("explains the balance breakdown and keeps unpaid bills informational", () => {
    const balances = computeBalances(snapshot())

    expect(balances.rincian).toMatchObject({
      recordedBalance: 14_500_000,
      utang: 1_000_000,
      piutang: 400_000,
      goalReservations: 1_000_000,
      // Liquid part that reduces available funds, then the full review pool.
      unassignedSavings: 400_000,
      unassignedSavingsCount: 3,
      unassignedSavingsTotal: 3_300_000,
      investmentReserved: 2_000_000,
      needsReviewCount: 1,
      needsReviewTotal: 900_000,
      estimate: true,
      unpaidBills: { count: 2, overdueCount: 1, total: 450_000 },
    })
    expect(balances.available.value).toBe(13_100_000)
  })

  it("reports the shortfall when reservations exceed the balance", () => {
    const balances = computeBalances({
      startingBalance: 1_000_000,
      movements: buildMovements({
        savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-1", amount: 3_000_000, goalId: "g1" })],
        categoryKinds: KINDS,
      }),
      categoryKinds: KINDS,
      now: AUGUST,
    })

    expect(balances.available).toMatchObject({ value: 0, shortfall: 2_000_000 })
  })

  it("includes the saved checkpoint in the assembled result", () => {
    const balances = computeBalances({
      ...snapshot(),
      checkpoint: resolveCheckpoint({ balance: 20_000_000, checkpointId: CHECKPOINT_ID, recordedAt: "2026-08-12T02:00:00.000Z" }),
    })

    expect(balances.currentCash).toMatchObject({ value: 20_000_000, provisional: false })
    expect(balances.available.value).toBe(18_600_000)
  })
})

describe("monthly series", () => {
  const movements = buildMovements({
    incomeRows: [
      HEADER,
      txRow({ id: "in-op", amount: 5_000_000 }),
      txRow({ id: "in-loan", amount: 3_000_000, cells: { 17: MOVEMENT_KINDS.debtPrincipalIn } }),
    ],
    expenseRows: [
      EXPENSE_HEADER,
      txRow({ id: "ex-loan", category: "Utang", amount: 2_000_000, cells: { 18: MOVEMENT_KINDS.debtPrincipalOut } }),
      txRow({ id: "ex-rutin", category: "Makan", amount: 1_000_000, sifat: "Rutin" }),
      txRow({ id: "ex-spesial", category: "Kondangan", amount: 500_000, sifat: "Spesial" }),
    ],
    savingsRows: [SAVINGS_HEADER, savingsRow({ id: "sv-1", amount: 400_000 })],
    categoryKinds: KINDS,
  })

  it("keeps loan principal in the inclusive cash flow", () => {
    const cashFlow = buildCashFlow({ movements, monthKey: "2026-08" })

    // Inclusive: operational + principal cash moves both count.
    expect(cashFlow).toMatchObject({ income: 8_000_000, expense: 3_500_000, net: 4_500_000, savings: 400_000 })
  })

  it("excludes loan principal and savings from analytical series", () => {
    const { monthly, routineMonthly, categories } = buildMonthlySeries(movements)

    expect(monthly[0]).toMatchObject({ pemasukan: 8_000_000, pengeluaran: 3_500_000, surplus: 4_500_000, tabungan: 400_000 })
    expect(routineMonthly[0]).toMatchObject({
      pemasukan: 5_000_000,
      pengeluaranRutin: 1_000_000,
      pengeluaranSpesial: 500_000,
      surplusRutin: 4_000_000,
    })
    expect(categories).toEqual([
      { name: "Makan", value: 1_000_000 },
      { name: "Kondangan", value: 500_000 },
    ])
  })

  it("keeps affordability labels neutral when nothing qualifies", () => {
    expect(computeUnpaidBills(null)).toEqual({ count: 0, overdueCount: 0, total: 0 })
  })
})
