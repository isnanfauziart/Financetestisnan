import { describe, it, expect } from "vitest"
import { buildRincianRows } from "@/app/dashboard/_components/balanceCopy"

describe("buildRincianRows shortfall row", () => {
  const base = {
    currentCash: { value: 20739500, provisional: true },
    available: { value: 0, shortfall: 3100500 },
    outstanding: { utang: 0, piutang: 0 },
    rincian: {
      recordedBalance: 20739500,
      goalReservations: 6000000,
      unassignedSavings: 18884000,
      unassignedSavingsCount: 4,
      investmentReserved: 0,
      needsReviewCount: 0,
      needsReviewTotal: 0,
      estimate: false,
      available: 0,
      shortfall: 3100500,
      unpaidBills: { count: 0, total: 0 },
    },
  }

  it("appends a warning row when allocations exceed the tracked cash", () => {
    const rows = buildRincianRows(base)
    const shortfall = rows.find(row => row.key === "shortfall")
    expect(shortfall).toBeTruthy()
    expect(shortfall.label).toBe("Kekurangan alokasi")
    expect(shortfall.value).toBe(3100500)
    expect(shortfall.note).toMatch(/bebaskan sebagian tabungan/)
  })

  it("adds no shortfall row when the allocation fits inside the cash", () => {
    const rows = buildRincianRows({ ...base, available: { value: 1200000, shortfall: 0 }, rincian: { ...base.rincian, shortfall: 0 } })
    expect(rows.find(row => row.key === "shortfall")).toBeUndefined()
  })
})
