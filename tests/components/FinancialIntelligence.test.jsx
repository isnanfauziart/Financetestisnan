import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import FinancialIntelligence from "@/components/landing/FinancialIntelligence"

describe("FinancialIntelligence", () => {
  it("switches among four distinct feature panels only after an explicit action", () => {
    render(<FinancialIntelligence />)

    expect(screen.getByRole("tab", { name: /Health Score/i })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("heading", { name: "Kondisi keuangan dalam satu skor" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /Cash Flow Forecast/i }))
    expect(screen.getByRole("heading", { name: "Proyeksi arus kas 90 hari" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Kondisi keuangan dalam satu skor" })).not.toBeInTheDocument()
    expect(screen.getByText("Contoh ilustratif")).toBeInTheDocument()
  })

  it("supports arrow, Home, and End key navigation with roving focus", () => {
    render(<FinancialIntelligence />)

    const health = screen.getByRole("tab", { name: /Health Score/i })
    fireEvent.keyDown(health, { key: "End" })

    const freedom = screen.getByRole("tab", { name: /Financial Freedom/i })
    expect(freedom).toHaveAttribute("aria-selected", "true")
    expect(freedom).toHaveFocus()
    expect(screen.getByText(/nominal Financial Freedom/i)).toBeInTheDocument()

    fireEvent.keyDown(freedom, { key: "Home" })
    expect(health).toHaveAttribute("aria-selected", "true")
    expect(health).toHaveFocus()
  })

  it("keeps the Google Sheet ownership path visible for every feature", () => {
    render(<FinancialIntelligence />)

    expect(screen.getByText("Google Sheet milikmu → Artami")).toBeInTheDocument()
    const tabs = screen.getAllByRole("tab")
    expect(tabs).toHaveLength(4)
    tabs.forEach((tab) => expect(tab).toHaveAttribute("aria-controls", "intelligence-feature-panel"))
    expect(screen.getByRole("tabpanel")).toHaveAttribute("id", "intelligence-feature-panel")
  })

  it("uses the approved Financial Intelligence messaging", () => {
    render(<FinancialIntelligence />)

    expect(screen.getByText("Artami memberikan insight serta proyeksi masa depan terkait kondisi keuangan kamu")).toBeInTheDocument()
    expect(screen.getByText("Salah satu fitur Artami")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Lihat prediksi Cash Flow kamu beberapa waktu kedepan/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Artami memproyeksikan nominal yang diperlukan untuk pensiun dini/i })).toBeInTheDocument()
    expect(screen.getByText("Kenali kondisi keuanganmu hari ini, ambil keputusan dengan lebih bijak, dan bangun masa depan yang lebih tenang.")).toBeInTheDocument()
  })
})
