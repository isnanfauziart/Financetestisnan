import { beforeEach, describe, expect, it, vi } from "vitest"

const doc = {
  addPage: vi.fn(),
  circle: vi.fn(),
  getNumberOfPages: vi.fn(() => 1),
  line: vi.fn(),
  rect: vi.fn(),
  roundedRect: vi.fn(),
  save: vi.fn(),
  setDrawColor: vi.fn(),
  setFillColor: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setLineWidth: vi.fn(),
  setPage: vi.fn(),
  setTextColor: vi.fn(),
  splitTextToSize: vi.fn(value => [value]),
  text: vi.fn(),
}

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => doc),
}))

const { generateReportPDF } = await import("@/lib/reportPdf")

function reportData() {
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

describe("monthly report watermark", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    doc.getNumberOfPages.mockReturnValue(1)
  })

  it("draws the Free watermark when requested", () => {
    generateReportPDF(reportData(), { watermark: true })

    expect(doc.text).toHaveBeenCalledWith(
      "ARTAMI FREE",
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ align: "center" })
    )
  })

  it("does not draw a watermark for Pro reports", () => {
    generateReportPDF(reportData(), { watermark: false })

    expect(doc.text.mock.calls.some(([value]) => value === "ARTAMI FREE")).toBe(false)
  })

  it("includes the supplied user name in the PDF text", () => {
    generateReportPDF({ ...reportData(), userName: "Siti Nur Aulia" })

    expect(doc.text.mock.calls.some(([value]) => value === "Siti Nur Aulia")).toBe(true)
  })

  it("keeps actual budget totals while showing routine and special report values", () => {
    generateReportPDF(specialExpenseReportData(), { watermark: false })

    const renderedText = doc.text.mock.calls.map(([value]) => String(value)).join("\n")
    expect(renderedText).toContain("Aktual")
    expect(renderedText).toContain("Rutin")
    expect(renderedText).toContain("Spesial")
    expect(renderedText).toContain("10.000.000")
    expect(renderedText).toContain("11.500.000")
    expect(renderedText).toContain("Pengeluaran Spesial")
    expect(renderedText).toContain("2.000.000")
    expect(renderedText).not.toContain("7.000.000")
    expect(doc.save).toHaveBeenCalledWith("Laporan-Keuangan-Jul-2026.pdf")
  })
})
