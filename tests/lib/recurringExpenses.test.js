import { describe, expect, it } from "vitest"
import { findRecurringExpenses } from "@/lib/recurringExpenses"

const NOW = new Date("2026-08-20T04:00:00.000Z")

function expense({ id, date, desc = "Netflix", category = "Hiburan", account = "Bank BCA", amount = 100000, ...rest }) {
  return { id, date, desc, category, account, amount, type: "expense", ...rest }
}

describe("findRecurringExpenses", () => {
  it("finds a stable expense across at least three recent WIB months", () => {
    const result = findRecurringExpenses({
      transactions: [
        expense({ id: "may", date: "5 Mei 2026", amount: 100000 }),
        expense({ id: "jun", date: "6 Jun 2026", amount: 110000 }),
        expense({ id: "jul", date: "7 Jul 2026", amount: 95000 }),
        expense({ id: "aug", date: "8 Agu 2026", amount: 105000 }),
      ],
      now: NOW,
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      description: "Netflix",
      category: "Hiburan",
      account: "Bank BCA",
      monthCount: 4,
      medianAmount: 102500,
      typicalDay: 6.5,
    })
    expect(result[0].fingerprint).toContain("netflix|hiburan|bank bca")
  })

  it("requires three distinct months inside the four-month WIB window", () => {
    const result = findRecurringExpenses({
      transactions: [
        expense({ id: "apr", date: "5 Apr 2026" }),
        expense({ id: "may", date: "5 Mei 2026" }),
        expense({ id: "jun", date: "5 Jun 2026" }),
      ],
      now: NOW,
    })

    expect(result).toHaveLength(0)
  })

  it("ignores special, event, non-expense, empty, and invalid transactions", () => {
    const result = findRecurringExpenses({
      transactions: [
        expense({ id: "special-1", date: "5 Mei 2026", expenseClass: "special" }),
        expense({ id: "event-1", date: "5 Jun 2026", eventId: "event-1" }),
        expense({ id: "income", date: "5 Jul 2026", type: "income" }),
        expense({ id: "empty", date: "5 Agu 2026", desc: "" }),
        expense({ id: "invalid", date: "not-a-date" }),
      ],
      now: NOW,
    })

    expect(result).toHaveLength(0)
  })

  it("rejects amounts with more than twenty percent deviation from the median", () => {
    const result = findRecurringExpenses({
      transactions: [
        expense({ id: "may", date: "5 Mei 2026", amount: 100000 }),
        expense({ id: "jun", date: "5 Jun 2026", amount: 100000 }),
        expense({ id: "jul", date: "5 Jul 2026", amount: 100000 }),
        expense({ id: "aug", date: "5 Agu 2026", amount: 130000 }),
      ],
      now: NOW,
    })

    expect(result).toHaveLength(0)
  })

  it("keeps fingerprints bounded when normalization expands a valid description", () => {
    const description = "ﬃ".repeat(500)
    const result = findRecurringExpenses({
      transactions: [
        expense({ id: "may", date: "5 Mei 2026", desc: description }),
        expense({ id: "jun", date: "5 Jun 2026", desc: description }),
        expense({ id: "jul", date: "5 Jul 2026", desc: description }),
      ],
      now: NOW,
    })

    expect(result).toHaveLength(1)
    expect(result[0].fingerprint).toMatch(/^recurring:v2:[0-9a-f]{16}$/)
    expect(result[0].fingerprint.length).toBeLessThanOrEqual(200)
  })

  it("honors a previously stored long v1 fingerprint after switching to v2", () => {
    const description = "ﬃ".repeat(300)
    const legacyFingerprint = `recurring:v1:${"ffi".repeat(300)}|hiburan|bank bca`
    const result = findRecurringExpenses({
      transactions: [
        expense({ id: "may", date: "5 Mei 2026", desc: description }),
        expense({ id: "jun", date: "5 Jun 2026", desc: description }),
        expense({ id: "jul", date: "5 Jul 2026", desc: description }),
      ],
      dismissedFingerprints: [legacyFingerprint],
      now: NOW,
    })

    expect(result).toHaveLength(0)
  })

  it("skips candidates already represented by a bill or dismissed by fingerprint", () => {
    const transactions = [
      expense({ id: "may", date: "5 Mei 2026" }),
      expense({ id: "jun", date: "5 Jun 2026" }),
      expense({ id: "jul", date: "5 Jul 2026" }),
    ]

    expect(findRecurringExpenses({
      transactions,
      bills: [{ nama: "Netflix", kategoriTransaksi: "Hiburan", akunBank: "Bank BCA", aktif: true }],
      now: NOW,
    })).toHaveLength(0)

    const candidate = findRecurringExpenses({ transactions, now: NOW })[0]
    expect(findRecurringExpenses({ transactions, dismissedFingerprints: [candidate.fingerprint], now: NOW })).toHaveLength(0)
  })

  it("keeps account and category streams separate and returns at most three", () => {
    const transactions = ["Netflix", "Spotify", "Gym", "Cloud", "Other"].flatMap((desc, index) => (
      ["Mei", "Jun", "Jul"].map((month, monthIndex) => expense({
        id: `${desc}-${month}`,
        date: `${monthIndex + 5} ${month} 2026`,
        desc,
        category: index === 4 ? "Belanja" : "Hiburan",
        account: index === 3 ? "OVO" : "Bank BCA",
        amount: 100000 + index * 1000,
      }))
    ))

    const result = findRecurringExpenses({ transactions, now: NOW })

    expect(result).toHaveLength(3)
    expect(result.every(item => item.account === "Bank BCA" || item.account === "OVO")).toBe(true)
    expect(result.some(item => item.description === "Cloud" && item.account === "OVO")).toBe(true)
  })
})
