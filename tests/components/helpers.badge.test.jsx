import { describe, it, expect } from "vitest"
import { countUrgentBills } from "@/app/dashboard/_components/helpers"

describe("countUrgentBills", () => {
  it("counts overdue bills", () => {
    expect(countUrgentBills([{ status: "overdue" }, { status: "overdue" }, { status: "paid" }])).toBe(2)
  })

  it("counts due_today bills", () => {
    expect(countUrgentBills([{ status: "due_today" }, { status: "due_soon" }])).toBe(1)
  })

  it("excludes due_soon bills", () => {
    expect(countUrgentBills([{ status: "due_soon" }, { status: "due_soon" }, { status: "upcoming" }])).toBe(0)
  })

  it("sums overdue and due_today in a mixed set", () => {
    const bills = [
      { status: "overdue" },
      { status: "overdue" },
      { status: "due_today" },
      { status: "due_soon" },
      { status: "paid" },
      { status: "overdue" },
    ]
    expect(countUrgentBills(bills)).toBe(4)
  })

  it("returns 0 for empty or missing input", () => {
    expect(countUrgentBills([])).toBe(0)
    expect(countUrgentBills(null)).toBe(0)
    expect(countUrgentBills(undefined)).toBe(0)
  })
})
