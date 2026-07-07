import { describe, expect, it } from "vitest"

import { computeBillStatus } from "@/lib/bills"

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

  it("marks bills due today correctly", () => {
    const result = computeBillStatus(makeBill({ tanggalJatuhTempo: 10 }), new Date("2026-07-10T00:00:00.000Z"))

    expect(result.status).toBe("due_today")
    expect(result.daysUntilDue).toBe(0)
  })

  it("marks bills due tomorrow as due_soon", () => {
    const result = computeBillStatus(makeBill({ tanggalJatuhTempo: 11 }), new Date("2026-07-10T00:00:00.000Z"))

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
      makeBill({ tanggalJatuhTempo: 31 }),
      new Date("2026-02-20T00:00:00.000Z")
    )

    expect(result.nextDueDate).toBe("2026-02-28")
    expect(result.status).toBe("upcoming")
  })
})
