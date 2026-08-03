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
})
