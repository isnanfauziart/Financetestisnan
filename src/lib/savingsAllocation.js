import { pickAmount } from "./parseSheetRow"
import { parseRupiah } from "./sheets"

/**
 * Savings rows are allocations of money the user already owns.
 *
 * `reserved`  — set aside and not yet owned by a goal (legacy default).
 * `allocated` — set aside for one explicit goal.
 * `released`  — the reservation was cancelled; the money is no longer set aside.
 */
export const ALLOCATION_STATUS = {
  reserved: "reserved",
  allocated: "allocated",
  released: "released",
}

export const ALLOCATION_STATUS_VALUES = Object.values(ALLOCATION_STATUS)

export const SAVINGS_COLUMNS = {
  goalId: 15,
  status: 16,
  remaining: 17,
  recordedAt: 18,
  movementKind: 19,
  relatedRecordId: 20,
}

export function normalizeAllocationStatus(value) {
  const normalized = String(value || "").trim().toLowerCase()
  return ALLOCATION_STATUS_VALUES.includes(normalized) ? normalized : ""
}

/**
 * Category → `liquid` | `investment` | `null` (unknown, needs review).
 */
export function savingsCategoryKinds(categories) {
  const map = new Map()
  const list = Array.isArray(categories?.savings)
    ? categories.savings
    : Array.isArray(categories)
      ? categories
      : []
  for (const item of list) {
    const name = typeof item === "string" ? item.trim() : String(item?.name || "").trim()
    if (!name) continue
    const kind = typeof item === "string" ? null : item?.savingsKind ?? item?.kind ?? null
    map.set(name.toLowerCase(), kind === "liquid" || kind === "investment" ? kind : null)
  }
  return map
}

export function classifySavingsRow(row, rowIndex, { categoryKinds } = {}) {
  const goalId = String(row?.[SAVINGS_COLUMNS.goalId] || "").trim()
  const statusRaw = normalizeAllocationStatus(row?.[SAVINGS_COLUMNS.status])
  const amount = pickAmount(row)
  const remainingCell = String(row?.[SAVINGS_COLUMNS.remaining] ?? "").trim()
  const status = statusRaw || (goalId ? ALLOCATION_STATUS.allocated : ALLOCATION_STATUS.reserved)
  const remaining = status === ALLOCATION_STATUS.released
    ? 0
    : remainingCell
      ? Math.max(0, parseRupiah(remainingCell))
      : amount
  const category = String(row?.[3] || "Tabungan").trim()
  const savingsKind = categoryKinds?.get(category.toLowerCase()) ?? null
  return {
    rowIndex,
    id: String(row?.[1] || "").trim(),
    date: row?.[0],
    desc: String(row?.[2] || "").trim(),
    category,
    account: String(row?.[7] || "").trim(),
    amount,
    remaining,
    goalId,
    status,
    savingsKind,
    liquid: savingsKind === "liquid",
    investment: savingsKind === "investment",
    needsReview: status !== ALLOCATION_STATUS.released && savingsKind === null,
    checkpointId: "",
    recordedAt: String(row?.[SAVINGS_COLUMNS.recordedAt] || "").trim(),
    movementKind: String(row?.[SAVINGS_COLUMNS.movementKind] || "").trim(),
  }
}

export function classifySavingsRows(rows = [], options = {}) {
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const classified = classifySavingsRow(row, i + 1, options)
    if (classified.amount <= 0) continue
    out.push(classified)
  }
  return out
}

const FINGERPRINT_INDEXES = [0, 1, 2, 3, 4, 7, 8, 15, 16, 17]

/**
 * Stable fingerprint of the cells a grouped assignment or release depends on.
 * The client echoes it back; the server re-reads each selected row and applies
 * nothing when any fingerprint changed.
 */
export function savingsRowFingerprint(row, rowIndex) {
  const cells = FINGERPRINT_INDEXES.map(index => String(row?.[index] ?? "").trim())
  return `sv:${rowIndex}:${cells.join("\u0001")}`
}

export function isReservedAllocation(allocation) {
  return allocation?.status === ALLOCATION_STATUS.reserved || allocation?.status === ALLOCATION_STATUS.allocated
}

/**
 * Splits reservations into the amounts that reduce available funds and the
 * amounts that need a human decision. Investment reservations are not deducted
 * from the current cash total a second time, and unknown classifications stay
 * out of the total so the displayed amount is only an estimate.
 */
export function summarizeAllocations(allocations = []) {
  const byGoal = {}
  let liquidAssigned = 0
  let liquidUnassigned = 0
  let investmentReserved = 0
  let releasedTotal = 0
  let needsReviewTotal = 0
  let needsReviewCount = 0
  let unassignedCount = 0
  let unassignedTotal = 0
  let allocatedCount = 0

  for (const allocation of allocations) {
    if (allocation.status === ALLOCATION_STATUS.released) {
      releasedTotal += allocation.amount
      continue
    }
    if (allocation.goalId) {
      allocatedCount += 1
      const bucket = byGoal[allocation.goalId] || (byGoal[allocation.goalId] = {
        allocated: 0,
        remaining: 0,
        count: 0,
        needsReviewTotal: 0,
        investment: 0,
      })
      bucket.allocated += allocation.amount
      bucket.remaining += allocation.remaining
      bucket.count += 1
      if (allocation.needsReview) bucket.needsReviewTotal += allocation.remaining
      if (allocation.investment) bucket.investment += allocation.remaining
    } else {
      unassignedCount += 1
      unassignedTotal += allocation.amount
    }

    if (allocation.needsReview) {
      needsReviewTotal += allocation.remaining
      needsReviewCount += 1
      continue
    }
    if (allocation.investment) {
      investmentReserved += allocation.remaining
      continue
    }
    if (allocation.liquid) {
      if (allocation.goalId) liquidAssigned += allocation.remaining
      else liquidUnassigned += allocation.remaining
    }
  }

  return {
    byGoal,
    liquidAssigned,
    liquidUnassigned,
    investmentReserved,
    releasedTotal,
    needsReviewTotal,
    needsReviewCount,
    unassignedCount,
    unassignedTotal,
    allocatedCount,
    reservedTotal: liquidAssigned + liquidUnassigned,
    estimate: needsReviewCount > 0,
  }
}
