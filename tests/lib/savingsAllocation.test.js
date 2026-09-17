import { describe, expect, it } from "vitest"

import {
  ALLOCATION_STATUS,
  classifySavingsRow,
  classifySavingsRows,
  isReservedAllocation,
  normalizeAllocationStatus,
  savingsCategoryKinds,
  savingsRowFingerprint,
  summarizeAllocations,
} from "@/lib/savingsAllocation"

const HEADER = ["Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net", "Catatan", "M", "Y", "Y2", "EventID", "EventSubKategori", "GoalId", "AllocationStatus", "SisaAlokasi", "RecordedAt", "MovementKind", "RelatedRecordId"]

function savingsRow({
  id = "sv-1",
  desc = "Setoran",
  category = "Tabungan Cash",
  amount = 500_000,
  account = "Bank BCA",
  month = "Agu",
  year = "2026",
  goalId = "",
  status = "",
  remaining = "",
  recordedAt = "",
  movementKind = "",
  relatedRecordId = "",
} = {}) {
  const row = new Array(21).fill("")
  row[0] = `1 ${month} ${year}`
  row[1] = id
  row[2] = desc
  row[3] = category
  row[4] = amount
  row[7] = account
  row[8] = amount
  row[10] = month
  row[11] = year
  row[15] = goalId
  row[16] = status
  row[17] = remaining
  row[18] = recordedAt
  row[19] = movementKind
  row[20] = relatedRecordId
  return row
}

const KINDS = savingsCategoryKinds({
  savings: [
    { name: "Tabungan Cash", active: true, savingsKind: "liquid" },
    { name: "Emas", active: true, savingsKind: "investment" },
  ],
})

describe("allocation status", () => {
  it("normalizes only the three known statuses", () => {
    expect(normalizeAllocationStatus("reserved")).toBe(ALLOCATION_STATUS.reserved)
    expect(normalizeAllocationStatus("Allocated")).toBe(ALLOCATION_STATUS.allocated)
    expect(normalizeAllocationStatus(" released ")).toBe(ALLOCATION_STATUS.released)
    expect(normalizeAllocationStatus("")).toBe("")
    expect(normalizeAllocationStatus("draft")).toBe("")
  })

  it("maps savings categories to usable-fund kinds", () => {
    expect(KINDS.get("tabungan cash")).toBe("liquid")
    expect(KINDS.get("emas")).toBe("investment")
    expect(KINDS.get("saham")).toBeUndefined()
  })

  it("accepts legacy string category lists as unknown classifications", () => {
    const legacy = savingsCategoryKinds(["Tabungan Cash", "Emas"])
    expect(legacy.get("tabungan cash")).toBeNull()
  })
})

describe("savings row classification", () => {
  it("treats a blank legacy row as reserved and unassigned", () => {
    const classified = classifySavingsRow(savingsRow(), 2, { categoryKinds: KINDS })

    expect(classified).toMatchObject({
      rowIndex: 2,
      goalId: "",
      status: ALLOCATION_STATUS.reserved,
      amount: 500_000,
      remaining: 500_000,
      savingsKind: "liquid",
      liquid: true,
      needsReview: false,
    })
    expect(isReservedAllocation(classified)).toBe(true)
  })

  it("treats a row with a goal as allocated even without a status cell", () => {
    const classified = classifySavingsRow(savingsRow({ goalId: "1700000001" }), 2, { categoryKinds: KINDS })

    expect(classified.status).toBe(ALLOCATION_STATUS.allocated)
    expect(classified.remaining).toBe(500_000)
  })

  it("honours an explicit remaining amount and a release", () => {
    expect(classifySavingsRow(savingsRow({ goalId: "g1", status: "allocated", remaining: "200000" }), 2, { categoryKinds: KINDS }).remaining).toBe(200_000)

    const released = classifySavingsRow(savingsRow({ goalId: "g1", status: "released", remaining: "200000" }), 2, { categoryKinds: KINDS })
    expect(released.remaining).toBe(0)
    expect(released.needsReview).toBe(false)
    expect(isReservedAllocation(released)).toBe(false)
  })

  it("flags an unknown usable-fund classification for review", () => {
    const classified = classifySavingsRow(savingsRow({ category: "Saham Lama" }), 2, { categoryKinds: KINDS })

    expect(classified.savingsKind).toBeNull()
    expect(classified.needsReview).toBe(true)
  })

  it("skips header and empty-amount rows", () => {
    const rows = [HEADER, savingsRow({ id: "sv-1", amount: 500_000 }), savingsRow({ id: "sv-2", amount: 0 })]
    expect(classifySavingsRows(rows, { categoryKinds: KINDS }).map(row => row.id)).toEqual(["sv-1"])
  })
})

describe("allocation fingerprints", () => {
  it("is stable for identical rows and changes with the data", () => {
    const row = savingsRow()
    expect(savingsRowFingerprint(row, 2)).toBe(savingsRowFingerprint([...row], 2))
    expect(savingsRowFingerprint(row, 2)).not.toBe(savingsRowFingerprint(savingsRow({ amount: 600_000 }), 2))
    expect(savingsRowFingerprint(row, 2)).not.toBe(savingsRowFingerprint(row, 3))
    expect(savingsRowFingerprint(row, 2)).not.toBe(savingsRowFingerprint(savingsRow({ goalId: "g1" }), 2))
    expect(savingsRowFingerprint(row, 2)).not.toBe(savingsRowFingerprint(savingsRow({ remaining: "100000" }), 2))
  })

  it("fingerprints the expected cells", () => {
    expect(savingsRowFingerprint(savingsRow({ id: "sv-9", amount: 250_000 }), 4))
      .toBe("sv:4:1 Agu 2026\u0001sv-9\u0001Setoran\u0001Tabungan Cash\u0001250000\u0001Bank BCA\u0001250000\u0001\u0001\u0001")
  })
})

describe("allocation summary", () => {
  it("deducts only known liquid reservations", () => {
    const rows = [
      HEADER,
      savingsRow({ id: "sv-1", goalId: "g1", amount: 1_000_000 }),
      savingsRow({ id: "sv-2", amount: 400_000 }),
      savingsRow({ id: "sv-3", category: "Emas", goalId: "g1", amount: 2_000_000 }),
    ]
    const summary = summarizeAllocations(classifySavingsRows(rows, { categoryKinds: KINDS }))

    expect(summary.liquidAssigned).toBe(1_000_000)
    expect(summary.liquidUnassigned).toBe(400_000)
    expect(summary.investmentReserved).toBe(2_000_000)
    expect(summary.reservedTotal).toBe(1_400_000)
    expect(summary.estimate).toBe(false)
    expect(summary.byGoal.g1).toMatchObject({ allocated: 3_000_000, remaining: 3_000_000, count: 2, investment: 2_000_000 })
  })

  it("keeps unknown classifications out of the total and marks the estimate", () => {
    const rows = [
      HEADER,
      savingsRow({ id: "sv-1", amount: 400_000 }),
      savingsRow({ id: "sv-2", category: "Saham Lama", amount: 900_000 }),
    ]
    const summary = summarizeAllocations(classifySavingsRows(rows, { categoryKinds: KINDS }))

    expect(summary.reservedTotal).toBe(400_000)
    expect(summary.needsReviewTotal).toBe(900_000)
    expect(summary.needsReviewCount).toBe(1)
    expect(summary.estimate).toBe(true)
  })

  it("excludes released money and counts the unassigned pool", () => {
    const rows = [
      HEADER,
      savingsRow({ id: "sv-1", goalId: "g1", status: "released", amount: 700_000 }),
      savingsRow({ id: "sv-2", amount: 300_000 }),
      savingsRow({ id: "sv-3", amount: 200_000 }),
    ]
    const summary = summarizeAllocations(classifySavingsRows(rows, { categoryKinds: KINDS }))

    expect(summary.releasedTotal).toBe(700_000)
    // The two unassigned rows stay reserved until assigned or released.
    expect(summary.reservedTotal).toBe(500_000)
    expect(summary.unassignedCount).toBe(2)
    expect(summary.unassignedTotal).toBe(500_000)
    expect(summary.byGoal).toEqual({})
  })

  it("keeps allocations of a goal that no longer exists", () => {
    const rows = [HEADER, savingsRow({ id: "sv-1", goalId: "deleted-goal", amount: 250_000 })]
    const summary = summarizeAllocations(classifySavingsRows(rows, { categoryKinds: KINDS }))

    expect(summary.byGoal["deleted-goal"]).toMatchObject({ allocated: 250_000, remaining: 250_000 })
    expect(summary.liquidAssigned).toBe(250_000)
  })
})
