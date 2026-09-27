import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import AnomalyAlerts from "@/components/AnomalyAlerts"

function tx({ id, month, year = "2026", amount, expenseClass = "routine" }) {
  return {
    id,
    type: "expense",
    category: "Makan",
    amount,
    month,
    year,
    expenseClass,
  }
}

describe("AnomalyAlerts", () => {
  it("excludes special expenses from current and baseline category values", () => {
    render(
      <AnomalyAlerts
        selectedMonth="Agu"
        selectedYear="2026"
        transactions={[
          tx({ id: "jun-routine", month: "Mei", amount: 1_000_000 }),
          tx({ id: "jun-special", month: "Mei", amount: 10_000_000, expenseClass: "special" }),
          tx({ id: "jul-routine", month: "Jun", amount: 1_000_000 }),
          tx({ id: "jul-special", month: "Jun", amount: 10_000_000, expenseClass: "special" }),
          tx({ id: "aug-routine", month: "Jul", amount: 1_000_000 }),
          tx({ id: "aug-special", month: "Jul", amount: 10_000_000, expenseClass: "special" }),
          tx({ id: "current-routine", month: "Agu", amount: 1_400_000 }),
          tx({ id: "current-special", month: "Agu", amount: 10_000_000, expenseClass: "special" }),
        ]}
      />
    )

    expect(screen.getByText("Makan")).toBeInTheDocument()
    const valuesRow = screen.getByText("Bulan ini:").closest("div")
    expect(valuesRow).toHaveTextContent("Bulan ini: Rp 1.4 jt")
    expect(valuesRow).toHaveTextContent("Rata-rata: Rp 1.0 jt")
  })

  it("names the three baseline months and the Spesial exclusion in the footnote", () => {
    render(
      <AnomalyAlerts
        selectedMonth="Agu"
        selectedYear="2026"
        transactions={[
          tx({ id: "may", month: "Mei", amount: 1_000_000 }),
          tx({ id: "jun", month: "Jun", amount: 1_000_000 }),
          tx({ id: "jul", month: "Jul", amount: 1_000_000 }),
          tx({ id: "current", month: "Agu", amount: 1_400_000 }),
        ]}
      />,
    )

    const footnote = screen.getByText(/Berdasarkan rata-rata Mei 2026, Jun 2026, Jul 2026/)
    expect(footnote).toHaveTextContent("Pengeluaran Spesial tidak diikutkan")
  })

  it("keeps the generic footnote wording when baseline months are missing", () => {
    render(
      <AnomalyAlerts
        selectedMonth="Mar"
        selectedYear="2026"
        transactions={[tx({ id: "current", month: "Mar", amount: 1_400_000 })]}
      />,
    )

    expect(screen.queryByText(/Berdasarkan rata-rata/)).not.toBeInTheDocument()
  })
})
