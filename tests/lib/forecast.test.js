import { describe, expect, it } from "vitest"

import { computeForecast } from "@/lib/forecast"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function monthData(months, incomes = 1000, expenses = 500) {
  return months.map((month, index) => ({
    month,
    year: "2026",
    pemasukan: Array.isArray(incomes) ? incomes[index] : incomes,
    pengeluaran: Array.isArray(expenses) ? expenses[index] : expenses,
    surplus: (Array.isArray(incomes) ? incomes[index] : incomes) - (Array.isArray(expenses) ? expenses[index] : expenses),
  }))
}

describe("computeForecast", () => {
  it("uses recency weights for six stable income months", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], [100, 110, 100, 110, 100, 110], 40),
      { now: new Date("2026-07-15T00:00:00.000Z") }
    )

    expect(result.incomeProfile).toBe("stable")
    expect(result.incomeMethod).toBe("weighted")
    expect(result.variableIncomeBaseline).toBeCloseTo(105.7142857, 5)
    expect(result.projectedIncome).toBeCloseTo(105.7142857, 5)
  })

  it("uses the median for irregular income with a large bonus", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], [100, 100, 100, 100, 100, 1000], 40),
      { now: new Date("2026-07-15T00:00:00.000Z") }
    )

    expect(result.incomeProfile).toBe("irregular")
    expect(result.incomeMethod).toBe("median")
    expect(result.variableIncomeBaseline).toBe(100)
    expect(result.projectedIncome).toBe(100)
  })

  it("excludes the current partial WIB month", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul"], [100, 100, 100, 100, 100, 100, 9999], 40),
      { now: new Date("2026-07-15T00:00:00.000Z") }
    )

    expect(result.monthsUsed).toBe(6)
    expect(result.variableIncomeBaseline).toBe(100)
    expect(result.chartData.at(-2).label).toBe("Jun 2026")
    expect(result.projectionMonth).toBe("Agu 2026")
  })

  it("uses the explicit current WIB month for the projection month", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul"], 100, 40),
      { now: new Date("2026-06-30T17:00:00.000Z") }
    )

    expect(result.monthsUsed).toBe(6)
    expect(result.projectionMonth).toBe("Agu 2026")
  })

  it("counts missing calendar months without treating them as zero", () => {
    const result = computeForecast(
      monthData(["Jan", "Mar", "Apr", "Mei"], 100, 40),
      { now: new Date("2026-06-15T00:00:00.000Z") }
    )

    expect(result.monthsUsed).toBe(4)
    expect(result.dataGapCount).toBe(1)
    expect(result.variableIncomeBaseline).toBe(100)
  })

  it("adds each recurring income and expense bill once for the target month", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], 1000, 500),
      {
        now: new Date("2026-07-15T00:00:00.000Z"),
        bills: [
          { id: "salary", tipe: "income", jumlah: 250, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" },
          { id: "rent", tipe: "expense", jumlah: 100, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" },
          { id: "loan", tipe: "expense", jumlah: 300, frekuensi: "quarterly", tanggalJatuhTempo: 1, kategoriBill: "Cicilan/Kredit", aktif: true, createdAt: "2026-02-01" },
        ],
      }
    )

    expect(result.scheduledIncome).toBe(250)
    expect(result.scheduledExpense).toBe(400)
    expect(result.projectedIncome).toBe(1250)
    expect(result.projectedExpense).toBe(900)
  })

  it("ignores non-positive and non-finite scheduled bill amounts", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], 1000, 500),
      {
        now: new Date("2026-07-15T00:00:00.000Z"),
        bills: [
          { id: "negative", tipe: "expense", jumlah: -100, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" },
          { id: "zero", tipe: "expense", jumlah: 0, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" },
          { id: "nan", tipe: "expense", jumlah: Number.NaN, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" },
          { id: "infinite", tipe: "expense", jumlah: Number.POSITIVE_INFINITY, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" },
        ],
      }
    )

    expect(result.scheduledIncome).toBe(0)
    expect(result.scheduledExpense).toBe(0)
  })

  it("removes billpay transactions from historical variable income without mixing types", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], 1250, 1000),
      {
        now: new Date("2026-07-15T00:00:00.000Z"),
        bills: [{ id: "salary", tipe: "income", jumlah: 250, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" }],
        transactions: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"].map((month) => ({
          id: `billpay:salary:2026-${month}`,
          type: "income",
          amount: 250,
          month,
          year: "2026",
        })),
      }
    )

    expect(result.variableIncomeBaseline).toBe(1000)
    expect(result.variableExpenseBaseline).toBe(1000)
    expect(result.scheduledIncome).toBe(250)
    expect(result.projectedIncome).toBe(1250)
  })

  it("removes billpay transactions from historical variable expenses before scheduling bills", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], [1000, 1000, 1000, 1000, 1000, 1300], 1000),
      {
        now: new Date("2026-07-15T00:00:00.000Z"),
        bills: [{ id: "rent", tipe: "expense", jumlah: 300, frekuensi: "monthly", tanggalJatuhTempo: 1, aktif: true, createdAt: "2026-01-01" }],
        transactions: [{ id: "billpay:rent:2026-06-05", type: "expense", amount: 300, month: "Jun", year: "2026" }],
      }
    )

    expect(result.variableExpenseBaseline).toBe(1000)
    expect(result.variableIncomeBaseline).toBeCloseTo(1085.7142857, 5)
    expect(result.scheduledExpense).toBe(300)
    expect(result.projectedIncome).toBeCloseTo(1085.7142857, 5)
    expect(result.projectedExpense).toBe(1300)
  })

  it("does not classify a zero-income month as stable from positive months alone", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], [100, 100, 100, 100, 100, 0], 40),
      { now: new Date("2026-07-15T00:00:00.000Z") }
    )

    expect(result.incomeProfile).toBe("irregular")
    expect(result.incomeMethod).toBe("median")
    expect(result.variableIncomeBaseline).toBe(100)
  })

  it("caps a one-off expense spike before applying recency weights", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], 1000, [100, 100, 100, 100, 100, 1000]),
      { now: new Date("2026-07-15T00:00:00.000Z") }
    )

    expect(result.variableExpenseBaseline).toBe(100)
  })

  it("does not invent occurrences for supported bills with invalid anchors", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], 1000, 500),
      {
        now: new Date("2026-07-15T00:00:00.000Z"),
        bills: [
          { id: "monthly-invalid", tipe: "expense", jumlah: 100, frekuensi: "monthly", tanggalJatuhTempo: "", aktif: true, createdAt: "2026-01-01" },
          { id: "quarterly-invalid", tipe: "expense", jumlah: 300, frekuensi: "quarterly", aktif: true, createdAt: "2026-02-01" },
        ],
      }
    )

    expect(result.scheduledExpense).toBe(0)
  })

  it("returns an unusable forecast with fewer than three complete months", () => {
    const result = computeForecast(
      monthData(["Jan", "Feb"], 1000, 500),
      { now: new Date("2026-03-15T00:00:00.000Z") }
    )

    expect(result.insufficientData).toBe(true)
    expect(result.monthsUsed).toBe(2)
    expect(result.projectedIncome).toBeNull()
    expect(result.projectedExpense).toBeNull()
    expect(result.projectedSurplus).toBeNull()
    expect(result.chartData).toEqual([])
  })

  it("connects the last actual surplus to one projected point", () => {
    const result = computeForecast(
      monthData(MONTHS.slice(0, 6), 1000, 400),
      { now: new Date("2026-07-15T00:00:00.000Z") }
    )

    const forecastPoints = result.chartData.filter((point) => point.surplusForecast !== null)
    expect(forecastPoints).toHaveLength(2)
    expect(forecastPoints[0].surplusForecast).toBe(600)
    expect(forecastPoints[1].surplusForecast).toBe(600)
    expect(result.chartData.every((point) => !("confidenceLow" in point) && !("confidenceHigh" in point))).toBe(true)
  })
})
