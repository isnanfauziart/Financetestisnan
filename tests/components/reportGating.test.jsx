import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import MonthlyReportButton from "@/components/MonthlyReportButton"

vi.mock("@/lib/useSharedData", () => ({
  useBudgets: () => ({ budgets: [] }),
}))
vi.mock("@/lib/reportPdf", () => ({
  generateReportPDF: vi.fn(),
}))
vi.mock("@/lib/healthScore", () => ({
  computeHealthScore: vi.fn(() => ({ score: 80 })),
}))

const { generateReportPDF } = await import("@/lib/reportPdf")

describe("report entitlement policy", () => {
  it.each([
    [true, true],
    [false, false],
  ])("propagates monthlyPdfWatermark=%s to the PDF generator", async (monthlyPdfWatermark, expected) => {
    render(
      <MonthlyReportButton
        selectedMonth="Jul"
        selectedYear="2026"
        transactions={[]}
        monthlyData={[]}
        allTransactions={[]}
        monthlyPdfWatermark={monthlyPdfWatermark}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /unduh laporan jul 2026/i }))

    await waitFor(() => expect(generateReportPDF).toHaveBeenCalled())
    expect(generateReportPDF.mock.calls.at(-1)[1]).toEqual({ watermark: expected })
  })
})
