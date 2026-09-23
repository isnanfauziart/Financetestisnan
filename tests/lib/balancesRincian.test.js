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

describe("buildRincianRows decision-19 composition (Wave 6)", () => {
  const balances = {
    currentCash: { value: 8000000, provisional: false, checkpointId: "abc" },
    recordedBalance: 9000000,
    available: { value: 4000000, shortfall: 0 },
    outstanding: { utang: 1000000, piutang: 250000, utangCount: 1, piutangCount: 1 },
    rincian: {
      recordedBalance: 9000000,
      goalReservations: 1500000,
      unassignedSavings: 500000,
      unassignedSavingsCount: 2,
      investmentReserved: 300000,
      needsReviewCount: 1,
      needsReviewTotal: 100000,
      estimate: false,
      available: 4000000,
      shortfall: 0,
      unpaidBills: { count: 1, total: 300000 },
    },
  }

  it("lists Saldo Tercatat and splits the three savings concepts into their own rows", () => {
    const rows = buildRincianRows(balances)
    const keys = rows.map(row => row.key)
    expect(keys).toContain("recorded")
    expect(keys).toContain("goalAllocated")
    expect(keys).toContain("unassignedSavings")
    expect(keys).toContain("investmentReserved")
    expect(keys).not.toContain("savingsHeld")

    expect(rows.find(row => row.key === "recorded")).toMatchObject({ label: "Saldo Tercatat", value: 9000000 })
    expect(rows.find(row => row.key === "goalAllocated")).toMatchObject({ label: "Dialokasikan ke target", value: 1500000 })
    expect(rows.find(row => row.key === "unassignedSavings")).toMatchObject({ label: "Tabungan tanpa target", value: 500000, count: 2 })
    expect(rows.find(row => row.key === "investmentReserved")).toMatchObject({ label: "Investasi (nilai nominal)", value: 300000 })
  })

  it("keeps unpaid bills informational and never labels net worth as savings", () => {
    const rows = buildRincianRows(balances)
    const unpaid = rows.find(row => row.key === "unpaidBills")
    expect(unpaid.note).toMatch(/Tidak mengurangi dana yang bisa dipakai/)
    const labels = rows.map(row => row.label).join(" | ")
    expect(labels).not.toContain("Kekayaan Bersih")
    expect(labels).not.toContain("Dana yang bisa dipakai saat ini")
    expect(labels).not.toContain("likuid")
  })

  it("drops zero-value detail rows but always keeps the checkpoint and available rows", () => {
    const rows = buildRincianRows({
      currentCash: { value: 0, provisional: true },
      recordedBalance: 0,
      available: { value: 0, shortfall: 0 },
      outstanding: {},
      rincian: {
        recordedBalance: 0,
        goalReservations: 0,
        unassignedSavings: 0,
        investmentReserved: 0,
        needsReviewCount: 0,
        needsReviewTotal: 0,
        shortfall: 0,
        unpaidBills: { count: 0, total: 0 },
      },
    })
    expect(rows.map(row => row.key)).toEqual(["current", "available"])
  })
})
