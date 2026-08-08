import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { generateAnnualReportHTML, generateReportHTML } from "@/lib/report"

const userName = "Siti <A&B>"

function monthlyData() {
  return {
    month: "Jul",
    year: "2026",
    transactions: [],
    budgets: [],
    allTransactions: [],
    monthlyData: [],
    healthScore: null,
  }
}

function specialExpenseReportData() {
  const transactions = [
    { type: "income", amount: 20_000_000, month: "Jul", year: "2026", category: "Gaji" },
    { type: "expense", amount: 1_500_000, month: "Jul", year: "2026", category: "Kebutuhan", expenseClass: "routine", desc: "Belanja rutin", date: "2026-07-10" },
    { type: "expense", amount: 10_000_000, month: "Jul", year: "2026", category: "Kebutuhan", expenseClass: "special", desc: "Laptop kerja", date: "2026-07-20" },
  ]

  return {
    month: "Jul",
    year: "2026",
    transactions,
    budgets: [{ kategori: "Kebutuhan", limit: 2_000_000 }],
    allTransactions: transactions,
    monthlyData: [
      { month: "Jun", year: "2026", pemasukan: 3_000_000, pengeluaran: 7_000_000 },
      { month: "Jul", year: "2026", pemasukan: 20_000_000, pengeluaran: 11_500_000 },
    ],
    routineMonthlyData: [
      { month: "Jun", year: "2026", pemasukan: 3_000_000, pengeluaranRutin: 2_000_000, pengeluaranAktual: 7_000_000, surplusRutin: 1_000_000 },
      { month: "Jul", year: "2026", pemasukan: 20_000_000, pengeluaranRutin: 1_500_000, pengeluaranAktual: 11_500_000, surplusRutin: 18_500_000 },
    ],
    healthScore: null,
  }
}

describe("report user names", () => {
  it("includes and escapes the supplied name in the monthly HTML report", () => {
    const html = generateReportHTML({ ...monthlyData(), userName })

    expect(html).toContain("Siti &lt;A&amp;B&gt;")
    expect(html).not.toContain(userName)
  })

  it("includes and escapes the supplied name in the annual HTML report", () => {
    const html = generateAnnualReportHTML({
      year: "2026",
      transactions: [],
      monthlyData: [],
      userName,
    })

    expect(html).toContain("Siti &lt;A&amp;B&gt;")
    expect(html).not.toContain(userName)
  })

  it("keeps user-facing callers from reducing names to first names", () => {
    for (const file of [
      "src/app/dashboard/page.js",
      "src/app/dashboard/ProfileTab.jsx",
      "src/components/LegacySheetConnector.jsx",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8")
      expect(source).not.toContain('.split(" ")[0]')
    }
  })
})

describe("special expense report totals", () => {
  it("keeps monthly headlines and budgets actual while showing routine and special totals", () => {
    const data = specialExpenseReportData()
    const html = generateReportHTML(data)

    expect(html).toContain("Aktual")
    expect(html).toContain("Rutin")
    expect(html).toContain("Spesial")
    expect(html).toContain("10.000.000")
    expect(html).toContain("11.500.000")

    const comparison = html.slice(html.indexOf("Perbandingan Bulan Lalu"))
    expect(comparison).toContain("2.000.000")
    expect(comparison).not.toContain("7.000.000")
  })

  it("keeps annual headlines actual and gives special purchases a visible section", () => {
    const data = specialExpenseReportData()
    const html = generateAnnualReportHTML({
      year: data.year,
      transactions: data.transactions,
      monthlyData: data.monthlyData,
      routineMonthlyData: data.routineMonthlyData,
    })

    expect(html).toContain("Aktual")
    expect(html).toContain("Rutin")
    expect(html).toContain("Spesial")
    expect(html).toContain("11.500.000")
    expect(html).toContain("10.000.000")

    const highlights = html.slice(html.indexOf("Highlights"), html.indexOf("Savings Rate per Bulan"))
    expect(highlights).toContain("2.000.000")
    expect(highlights).not.toContain("11.500.000")

    const specialSection = html.slice(html.indexOf("Pengeluaran Spesial"))
    expect(specialSection).toContain("Laptop kerja")
    expect(specialSection).toContain("10.000.000")
  })
})
