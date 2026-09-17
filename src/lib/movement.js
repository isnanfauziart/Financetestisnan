/**
 * Cash-movement metadata for every ledger row.
 *
 * `cashDelta`    — effect on the recorded/current cash balance.
 * `cashFlow`     — counted in the inclusive Uang masuk / Uang keluar summary.
 * `operational`  — counted by budgets, Health Score, routine trends, and insights.
 *
 * Loan principal moves real cash but is not spending, so it keeps `cashFlow`
 * and loses `operational`. Savings allocations only change ownership of money
 * the user already owns, so they move no cash at all.
 */
export const MOVEMENT_KINDS = {
  operationalIncome: "operational_income",
  operationalExpense: "operational_expense",
  debtPrincipalIn: "debt_principal_in",
  debtPrincipalOut: "debt_principal_out",
  receivablePrincipalOut: "receivable_principal_out",
  receivablePrincipalIn: "receivable_principal_in",
  savingsAllocation: "savings_allocation",
  goalFundedExpense: "goal_funded_expense",
}

export const MOVEMENT_KIND_VALUES = Object.values(MOVEMENT_KINDS)

const MOVEMENT_RULES = {
  [MOVEMENT_KINDS.operationalIncome]: { cashDelta: 1, cashFlow: true, operational: true },
  [MOVEMENT_KINDS.operationalExpense]: { cashDelta: -1, cashFlow: true, operational: true },
  [MOVEMENT_KINDS.debtPrincipalIn]: { cashDelta: 1, cashFlow: true, operational: false },
  [MOVEMENT_KINDS.debtPrincipalOut]: { cashDelta: -1, cashFlow: true, operational: false },
  [MOVEMENT_KINDS.receivablePrincipalOut]: { cashDelta: -1, cashFlow: true, operational: false },
  [MOVEMENT_KINDS.receivablePrincipalIn]: { cashDelta: 1, cashFlow: true, operational: false },
  [MOVEMENT_KINDS.savingsAllocation]: { cashDelta: 0, cashFlow: false, operational: false },
  [MOVEMENT_KINDS.goalFundedExpense]: { cashDelta: -1, cashFlow: true, operational: true },
}

export const TAB_TYPES = { Pemasukan: "income", Pengeluaran: "expense", Tabungan: "savings" }

const MOVEMENT_KEY_INDEX = { Pemasukan: 17, Pengeluaran: 18, Tabungan: 19 }
// Savings allocations never carry a checkpoint id: they move no cash, so they
// must never enter the current-cash adjustment sum.
const CHECKPOINT_KEY_INDEX = { Pemasukan: 15, Pengeluaran: 16, Tabungan: null }
const RELATED_KEY_INDEX = { Pemasukan: 18, Pengeluaran: 19, Tabungan: 20 }
const RECORDED_AT_INDEX = { Pemasukan: 16, Pengeluaran: 17, Tabungan: 18 }

export function movementCellIndexes(tab) {
  return {
    movementKind: MOVEMENT_KEY_INDEX[tab] ?? null,
    checkpointId: CHECKPOINT_KEY_INDEX[tab] ?? null,
    relatedRecordId: RELATED_KEY_INDEX[tab] ?? null,
    recordedAt: RECORDED_AT_INDEX[tab] ?? null,
  }
}

export function isKnownMovementKind(kind) {
  return Object.prototype.hasOwnProperty.call(MOVEMENT_RULES, String(kind || "").trim())
}

export function movementRules(kind) {
  return MOVEMENT_RULES[String(kind || "").trim()] || null
}

/** Unknown kinds fail open to today's behavior for display and analytics. */
export function movementIncludesCashFlow(kind) {
  const rules = movementRules(kind)
  return rules ? rules.cashFlow : true
}

export function movementIsOperational(kind) {
  const rules = movementRules(kind)
  return rules ? rules.operational : true
}

export function movementCashDelta(kind) {
  const rules = movementRules(kind)
  return rules ? rules.cashDelta : 0
}

/**
 * Legacy rows predate movement metadata. Only rows the debt workflow created
 * carry a `debtpay:` id, so those are the only rows reclassified as principal;
 * a manually recorded `Utang` category expense keeps its historical treatment.
 */
export function deriveLegacyMovementKind({ tab, rowId } = {}) {
  const id = String(rowId || "").trim().toLowerCase()
  if (tab === "Pemasukan") {
    return id.startsWith("debtpay:") ? MOVEMENT_KINDS.receivablePrincipalIn : MOVEMENT_KINDS.operationalIncome
  }
  if (tab === "Pengeluaran") {
    return id.startsWith("debtpay:") ? MOVEMENT_KINDS.debtPrincipalOut : MOVEMENT_KINDS.operationalExpense
  }
  return MOVEMENT_KINDS.savingsAllocation
}

export function resolveMovementKind({ kind, tab, rowId } = {}) {
  const clean = String(kind || "").trim()
  if (isKnownMovementKind(clean)) return clean
  return deriveLegacyMovementKind({ tab, rowId })
}

export const SHEET_MONTH_ORDER = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6,
  Jul: 7, Agu: 8, Ags: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12,
}

/** Comparable `YYYY-MM` key used for month ordering and history cutoffs. */
export function sheetMonthKey(month, year) {
  const order = SHEET_MONTH_ORDER[String(month || "").trim()]
  const normalizedYear = String(year ?? "").trim()
  if (!order || !normalizedYear) return ""
  return `${normalizedYear}-${String(order).padStart(2, "0")}`
}

export function sheetMonthFromIndex(monthIndex) {
  const names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
  return names[monthIndex] || ""
}
