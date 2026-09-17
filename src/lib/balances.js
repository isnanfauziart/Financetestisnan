import { parseRupiah } from "./sheets"
import { pickAmount } from "./parseSheetRow"
import { normalizeExpenseClass } from "./expenseClass"
import { classifySavingsRows, summarizeAllocations, ALLOCATION_STATUS } from "./savingsAllocation"
import {
  MOVEMENT_KINDS,
  movementCashDelta,
  movementCellIndexes,
  movementIncludesCashFlow,
  movementIsOperational,
  resolveMovementKind,
  sheetMonthFromIndex,
  sheetMonthKey,
} from "./movement"
import { getWibDateParts } from "./wibCalendar"

/**
 * Canonical money model. Every displayed balance comes from here so no UI
 * component implements its own formula.
 *
 *   Saldo Tercatat          = saldo awal + cash income − cash expenses (from the
 *                             saldo awal month onward)
 *   Kekayaan Bersih         = Saldo Tercatat + outstanding Piutang − outstanding Utang
 *   Saldo uang saat ini     = saved Total saldo saat ini + movements of the active checkpoint
 *   Dana yang bisa dipakai = max(0, Saldo uang saat ini − liquid reservations)
 */

const TAB_DEFINITIONS = [
  { tab: "Pemasukan", type: "income", rowsKey: "incomeRows", idPrefix: "in" },
  { tab: "Pengeluaran", type: "expense", rowsKey: "expenseRows", idPrefix: "ex" },
]

function cellText(value) {
  return String(value ?? "").trim()
}

export function buildMovements({ incomeRows = [], expenseRows = [], savingsRows = [], categoryKinds, now = new Date() } = {}) {
  const movements = []
  const fallbackYear = String(getWibDateParts(now)?.year || new Date().getFullYear())

  const source = { incomeRows, expenseRows }
  for (const definition of TAB_DEFINITIONS) {
    const rows = source[definition.rowsKey] || []
    const indexes = movementCellIndexes(definition.tab)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !cellText(row[10])) continue
      const amount = pickAmount(row)
      if (!(amount > 0)) continue
      const id = cellText(row[1]) || `${definition.idPrefix}-${i}`
      const kind = resolveMovementKind({
        kind: indexes.movementKind === null ? "" : row[indexes.movementKind],
        tab: definition.tab,
        rowId: id,
      })
      const month = cellText(row[10])
      const year = cellText(row[11]) || fallbackYear
      movements.push({
        tab: definition.tab,
        type: definition.type,
        rowIndex: i + 1,
        id,
        date: row[0],
        desc: cellText(row[2]),
        category: cellText(row[3]) || "Lainnya",
        amount,
        account: cellText(row[7]),
        eventId: cellText(row[13]) || null,
        eventSubKategori: cellText(row[14]) || null,
        expenseClass: definition.type === "expense" ? normalizeExpenseClass(row[15]) : null,
        month,
        year,
        monthKey: sheetMonthKey(month, year),
        kind,
        cashDelta: movementCashDelta(kind),
        cashFlow: movementIncludesCashFlow(kind),
        operational: movementIsOperational(kind),
        checkpointId: indexes.checkpointId === null ? "" : cellText(row[indexes.checkpointId]),
        recordedAt: indexes.recordedAt === null ? "" : cellText(row[indexes.recordedAt]),
        relatedRecordId: indexes.relatedRecordId === null ? "" : cellText(row[indexes.relatedRecordId]),
        goalId: "",
        allocationStatus: "",
        allocationRemaining: 0,
        needsReview: false,
        savingsKind: null,
      })
    }
  }

  for (const allocation of classifySavingsRows(savingsRows, { categoryKinds })) {
    const kind = resolveMovementKind({ kind: allocation.movementKind, tab: "Tabungan", rowId: allocation.id })
    const month = cellText(savingsRows[allocation.rowIndex - 1]?.[10])
    const year = cellText(savingsRows[allocation.rowIndex - 1]?.[11]) || fallbackYear
    if (!month) continue
    movements.push({
      tab: "Tabungan",
      type: "savings",
      rowIndex: allocation.rowIndex,
      id: allocation.id || `sv-${allocation.rowIndex - 1}`,
      date: savingsRows[allocation.rowIndex - 1]?.[0],
      desc: allocation.desc,
      category: allocation.category,
      amount: allocation.amount,
      account: allocation.account,
      eventId: cellText(savingsRows[allocation.rowIndex - 1]?.[13]) || null,
      eventSubKategori: cellText(savingsRows[allocation.rowIndex - 1]?.[14]) || null,
      expenseClass: null,
      month,
      year,
      monthKey: sheetMonthKey(month, year),
      kind,
      cashDelta: movementCashDelta(kind),
      cashFlow: movementIncludesCashFlow(kind),
      operational: movementIsOperational(kind),
      checkpointId: "",
      recordedAt: allocation.recordedAt,
      relatedRecordId: "",
      goalId: allocation.goalId,
      allocationStatus: allocation.status,
      allocationRemaining: allocation.remaining,
      needsReview: allocation.needsReview,
      savingsKind: allocation.savingsKind,
    })
  }

  return movements
}

export function computeRecordedBalance({ startingBalance = 0, startMonthKey = "", movements = [] } = {}) {
  const buckets = new Map()
  for (const movement of movements) {
    if (!movement.monthKey) continue
    const bucket = buckets.get(movement.monthKey) || { delta: 0, month: movement.month, year: movement.year }
    bucket.delta += movement.cashDelta * movement.amount
    buckets.set(movement.monthKey, bucket)
  }

  const keys = [...buckets.keys()].sort()
  let running = Number(startingBalance) || 0
  const history = []
  for (const key of keys) {
    const bucket = buckets.get(key)
    if (!startMonthKey || key >= startMonthKey) running += bucket.delta
    history.push({ key, month: bucket.month, year: bucket.year, value: running })
  }

  const value = history.length > 0 ? history[history.length - 1].value : Number(startingBalance) || 0
  const delta = history.length >= 2 ? value - history[history.length - 2].value : 0
  return { value, history, delta }
}

export function computeDebtTotals(rows = []) {
  let utang = 0
  let piutang = 0
  let utangCount = 0
  let piutangCount = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !cellText(row[0]) || !cellText(row[1])) continue
    const status = cellText(row[5]).toLowerCase()
    if (status === "settled") continue
    const remaining = Math.max(0, parseRupiah(row[6] || 0))
    if (remaining <= 0) continue
    if (cellText(row[3]).toLowerCase() === "piutang") {
      piutang += remaining
      piutangCount += 1
    } else {
      utang += remaining
      utangCount += 1
    }
  }

  return { utang, piutang, netWorthContribution: piutang - utang, utangCount, piutangCount }
}

export function computeCurrentCash({ checkpoint, recordedBalance = 0, movements = [] } = {}) {
  if (checkpoint?.saved) {
    const adjustment = movements.reduce(
      (sum, movement) => sum + (movement.checkpointId && movement.checkpointId === checkpoint.checkpointId ? movement.cashDelta * movement.amount : 0),
      0
    )
    return {
      value: checkpoint.balance + adjustment,
      provisional: false,
      checkpointId: checkpoint.checkpointId,
      recordedAt: checkpoint.recordedAt,
      adjustment,
    }
  }
  return {
    value: Number(recordedBalance) || 0,
    provisional: true,
    checkpointId: "",
    recordedAt: "",
    adjustment: 0,
  }
}

export function computeAvailableFunds({ currentCash = 0, reservations = 0 } = {}) {
  const difference = (Number(currentCash) || 0) - (Number(reservations) || 0)
  return {
    value: Math.max(0, difference),
    shortfall: Math.max(0, -difference),
    raw: difference,
  }
}

export function buildCashFlow({ movements = [], monthKey = "" } = {}) {
  let income = 0
  let expense = 0
  let savings = 0
  for (const movement of movements) {
    if (movement.monthKey !== monthKey) continue
    if (movement.type === "savings") {
      savings += movement.amount
      continue
    }
    if (!movement.cashFlow) continue
    if (movement.cashDelta > 0) income += movement.amount
    else if (movement.cashDelta < 0) expense += movement.amount
  }
  return { income, expense, net: income - expense, savings, monthKey }
}

export function buildMonthlySeries(movements = []) {
  const monthly = new Map()
  const routine = new Map()
  const categories = new Map()

  const bucketFor = (map, movement) => {
    const existing = map.get(movement.monthKey)
    if (existing) return existing
    const created = { month: movement.month, year: movement.year, sortKey: movement.monthKey }
    map.set(movement.monthKey, created)
    return created
  }

  for (const movement of movements) {
    if (!movement.monthKey) continue
    const actual = bucketFor(monthly, movement)
    const analytical = bucketFor(routine, movement)

    if (movement.type === "savings") {
      actual.tabungan = (actual.tabungan || 0) + movement.amount
      analytical.tabungan = (analytical.tabungan || 0) + movement.amount
      continue
    }
    if (movement.cashFlow) {
      if (movement.cashDelta > 0) actual.pemasukan = (actual.pemasukan || 0) + movement.amount
      else if (movement.cashDelta < 0) actual.pengeluaran = (actual.pengeluaran || 0) + movement.amount
    }
    if (movement.operational) {
      if (movement.cashDelta > 0) {
        analytical.pemasukan = (analytical.pemasukan || 0) + movement.amount
      } else if (movement.cashDelta < 0) {
        const key = movement.expenseClass === "special" ? "pengeluaranSpesial" : "pengeluaranRutin"
        analytical[key] = (analytical[key] || 0) + movement.amount
      }
      if (movement.type === "expense") {
        categories.set(movement.category, (categories.get(movement.category) || 0) + movement.amount)
      }
    }
  }

  const toRows = map => [...map.values()]
    .map(row => ({
      month: row.month,
      year: row.year,
      sortKey: row.sortKey,
      pemasukan: row.pemasukan || 0,
      pengeluaran: row.pengeluaran || 0,
      tabungan: row.tabungan || 0,
      surplus: (row.pemasukan || 0) - (row.pengeluaran || 0),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const routineRows = [...routine.values()]
    .map(row => ({
      month: row.month,
      year: row.year,
      sortKey: row.sortKey,
      pemasukan: row.pemasukan || 0,
      pengeluaranRutin: row.pengeluaranRutin || 0,
      pengeluaranSpesial: row.pengeluaranSpesial || 0,
      pengeluaranAktual: (row.pengeluaranRutin || 0) + (row.pengeluaranSpesial || 0),
      surplusRutin: (row.pemasukan || 0) - (row.pengeluaranRutin || 0),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  return {
    monthly: toRows(monthly),
    routineMonthly: routineRows,
    categories: [...categories.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7),
  }
}

export function computeUnpaidBills(billsSummary) {
  const items = [...(billsSummary?.overdue || []), ...(billsSummary?.upcoming || [])]
  return {
    count: items.length,
    overdueCount: Number(billsSummary?.overdueCount || 0),
    total: Number(billsSummary?.totalUpcoming || 0) + Number(billsSummary?.totalOverdue || 0),
  }
}

/**
 * Projects savings movements back onto the allocation shape the summary
 * expects, so reservation totals always derive from the same classification.
 */
export function allocationMovements(movements = []) {
  return movements
    .filter(movement => movement.type === "savings")
    .map(movement => ({
      rowIndex: movement.rowIndex,
      id: movement.id,
      category: movement.category,
      amount: movement.amount,
      remaining: movement.allocationRemaining,
      goalId: movement.goalId,
      status: movement.allocationStatus,
      savingsKind: movement.savingsKind,
      liquid: movement.savingsKind === "liquid",
      investment: movement.savingsKind === "investment",
      needsReview: Boolean(movement.needsReview),
    }))
}

export function computeBalances({
  startingBalance = 0,
  startingBalanceDate = "",
  startingBalanceConfirmed = false,
  movements = [],
  debtRows = [],
  categoryKinds,
  checkpoint = null,
  billsSummary = null,
  now = new Date(),
} = {}) {
  const startMonthKey = String(startingBalanceDate || "").trim().slice(0, 7)
  const recorded = computeRecordedBalance({ startingBalance, startMonthKey, movements })
  const debts = computeDebtTotals(debtRows)
  const currentCash = computeCurrentCash({ checkpoint, recordedBalance: recorded.value, movements })
  const allocations = summarizeAllocations(allocationMovements(movements))
  const available = computeAvailableFunds({ currentCash: currentCash.value, reservations: allocations.reservedTotal })

  const wib = getWibDateParts(now)
  const currentMonthKey = wib ? sheetMonthKey(sheetMonthFromIndex(wib.monthIndex), String(wib.year)) : ""
  const monthLabel = wib ? `${sheetMonthFromIndex(wib.monthIndex)} ${wib.year}` : ""
  const cashFlow = buildCashFlow({ movements, monthKey: currentMonthKey })

  const netWorth = recorded.value + debts.netWorthContribution

  return {
    startingBalance: Number(startingBalance) || 0,
    startingBalanceDate: String(startingBalanceDate || "").trim(),
    startingBalanceConfirmed: Boolean(startingBalanceConfirmed),
    startMonthKey,
    recordedBalance: recorded.value,
    netWorth,
    netWorthMonthlyDelta: recorded.delta,
    netWorthHistory: recorded.history.map(entry => ({ month: entry.month, year: entry.year, value: entry.value })),
    outstanding: { utang: debts.utang, piutang: debts.piutang, utangCount: debts.utangCount, piutangCount: debts.piutangCount },
    currentCash,
    allocations,
    available,
    cashFlow: { ...cashFlow, month: currentMonthKey ? sheetMonthFromIndex(wib.monthIndex) : "", year: currentMonthKey ? String(wib.year) : "", label: monthLabel },
    rincian: {
      recordedBalance: recorded.value,
      utang: debts.utang,
      piutang: debts.piutang,
      goalReservations: allocations.liquidAssigned,
      unassignedSavings: allocations.liquidUnassigned,
      unassignedSavingsCount: allocations.unassignedCount,
      unassignedSavingsTotal: allocations.unassignedTotal,
      investmentReserved: allocations.investmentReserved,
      needsReviewCount: allocations.needsReviewCount,
      needsReviewTotal: allocations.needsReviewTotal,
      estimate: allocations.estimate,
      available: available.value,
      shortfall: available.shortfall,
      unpaidBills: computeUnpaidBills(billsSummary),
    },
  }
}

export { MOVEMENT_KINDS, ALLOCATION_STATUS }
