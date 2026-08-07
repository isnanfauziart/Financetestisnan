import { describe, expect, it } from "vitest"

import { computeBillStatus, getBillOccurrencesInMonth } from "@/lib/bills"

function makeBill(overrides = {}) {
  return {
    id: "bill-1",
    nama: "Listrik",
    jumlah: 250000,
    tipe: "expense",
    kategoriBill: "Listrik",
    kategoriTransaksi: "Tagihan",
    frekuensi: "monthly",
    tanggalJatuhTempo: 5,
    akunBank: "BCA",
    aktif: true,
    terakhirDibayar: "",
    catatan: "",
    createdAt: "2026-01-01",
    ...overrides,
  }
}

describe("computeBillStatus", () => {
  it("marks unpaid past-due monthly bills as overdue", () => {
    const result = computeBillStatus(makeBill(), new Date("2026-07-10T00:00:00.000Z"))

    expect(result.status).toBe("overdue")
    expect(result.daysUntilDue).toBeLessThan(0)
    expect(result.nextDueDate).toBe("2026-07-05")
  })

  it("keeps the prior monthly occurrence overdue before the current due day", () => {
    const result = computeBillStatus(makeBill(), new Date("2026-08-03T00:00:00.000Z"))

    expect(result.currentCycleDueDate).toBe("2026-07-05")
    expect(result.nextDueDate).toBe("2026-07-05")
    expect(result.status).toBe("overdue")
  })

  it("marks bills due today correctly", () => {
    const result = computeBillStatus(makeBill({ tanggalJatuhTempo: 10 }), new Date("2026-07-10T00:00:00.000Z"))

    expect(result.status).toBe("due_today")
    expect(result.daysUntilDue).toBe(0)
  })

  it("marks bills due tomorrow as due_soon", () => {
    const result = computeBillStatus(
      makeBill({ tanggalJatuhTempo: 11, createdAt: "2026-07-01" }),
      new Date("2026-07-10T00:00:00.000Z")
    )

    expect(result.status).toBe("due_soon")
    expect(result.daysUntilDue).toBe(1)
  })

  it("does not mark a bill overdue if it was already paid for the current cycle", () => {
    const result = computeBillStatus(
      makeBill({ terakhirDibayar: "2026-07-06" }),
      new Date("2026-07-10T00:00:00.000Z")
    )

    expect(result.status).toBe("upcoming")
    expect(result.daysUntilDue).toBeGreaterThan(0)
    expect(result.nextDueDate).toBe("2026-08-05")
  })

  it("clamps month-end due dates to the last day of the month", () => {
    const result = computeBillStatus(
      makeBill({ tanggalJatuhTempo: 31, createdAt: "2026-02-01" }),
      new Date("2026-02-20T00:00:00.000Z")
    )

    expect(result.nextDueDate).toBe("2026-02-28")
    expect(result.status).toBe("upcoming")
  })
})

describe("getBillOccurrencesInMonth", () => {
  it("clamps a monthly due day to the last day of the month", () => {
    expect(getBillOccurrencesInMonth(makeBill({ tanggalJatuhTempo: 31 }), 2026, 1)).toEqual([
      "2026-02-28",
    ])
  })

  it("returns every matching weekday for a weekly bill", () => {
    const occurrences = getBillOccurrencesInMonth(
      makeBill({ frekuensi: "weekly", tanggalJatuhTempo: 1 }),
      2026,
      5
    )

    expect(occurrences).toEqual([
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ])
  })

  it("does not emit a monthly occurrence before createdAt", () => {
    const bill = makeBill({
      frekuensi: "monthly",
      tanggalJatuhTempo: 5,
      createdAt: "2026-06-06",
    })

    expect(getBillOccurrencesInMonth(bill, 2026, 5)).toEqual([])
    expect(getBillOccurrencesInMonth(bill, 2026, 6)).toEqual(["2026-07-05"])
  })

  it("does not emit a weekly occurrence before createdAt", () => {
    const bill = makeBill({
      frekuensi: "weekly",
      tanggalJatuhTempo: 1,
      createdAt: "2026-06-03",
    })

    expect(getBillOccurrencesInMonth(bill, 2026, 5)).toEqual([
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ])
  })

  it("keeps biweekly occurrences on the createdAt cadence", () => {
    const bill = makeBill({
      frekuensi: "biweekly",
      tanggalJatuhTempo: 1,
      createdAt: "2026-06-01",
    })

    expect(getBillOccurrencesInMonth(bill, 2026, 5)).toEqual([
      "2026-06-01",
      "2026-06-15",
      "2026-06-29",
    ])
    expect(getBillOccurrencesInMonth(bill, 2026, 6)).toEqual([
      "2026-07-13",
      "2026-07-27",
    ])
  })

  it("uses the createdAt month as the quarterly anchor", () => {
    const bill = makeBill({
      frekuensi: "quarterly",
      tanggalJatuhTempo: 31,
      createdAt: "2026-01-15",
    })

    expect(getBillOccurrencesInMonth(bill, 2026, 3)).toEqual(["2026-04-30"])
    expect(getBillOccurrencesInMonth(bill, 2026, 4)).toEqual([])
  })

  it("uses the createdAt month for yearly bills and their configured day", () => {
    const bill = makeBill({
      frekuensi: "yearly",
      tanggalJatuhTempo: 31,
      createdAt: "2025-05-12",
    })

    expect(getBillOccurrencesInMonth(bill, 2026, 4)).toEqual(["2026-05-31"])
    expect(getBillOccurrencesInMonth(bill, 2026, 3)).toEqual([])
  })

  it("does not treat a missing non-monthly anchor as monthly", () => {
    expect(getBillOccurrencesInMonth(makeBill({ frekuensi: "quarterly", createdAt: "" }), 2026, 1)).toEqual([])
  })

  it("uses the current recurring cycle when checking paid status", () => {
    const result = computeBillStatus(
      makeBill({
        frekuensi: "weekly",
        tanggalJatuhTempo: 1,
        createdAt: "2026-06-01",
        terakhirDibayar: "2026-07-06",
      }),
      new Date("2026-07-08T00:00:00.000Z")
    )

    expect(result.currentCycleDueDate).toBe("2026-07-06")
    expect(result.isPaidForCurrentCycle).toBe(true)
    expect(result.nextDueDate).toBe("2026-07-13")
    expect(result.status).toBe("upcoming")
  })

  it("marks a missed quarterly occurrence overdue across an anchor month", () => {
    const result = computeBillStatus(
      makeBill({
        frekuensi: "quarterly",
        tanggalJatuhTempo: 15,
        createdAt: "2026-01-15",
      }),
      new Date("2026-06-20T00:00:00.000Z")
    )

    expect(result.currentCycleDueDate).toBe("2026-04-15")
    expect(result.nextDueDate).toBe("2026-04-15")
    expect(result.daysUntilDue).toBe(-66)
    expect(result.status).toBe("overdue")
    expect(result.isPaidForCurrentCycle).toBe(false)
  })
})
