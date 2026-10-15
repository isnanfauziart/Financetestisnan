import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import StatTile from "@/components/charts/StatTile"

describe("StatTile", () => {
  it("renders a compact value by default", () => {
    render(<StatTile label="Pemasukan" value="Rp 3.2 jt" tone="income" />)

    const value = screen.getByText("Rp 3.2 jt")
    expect(value).toHaveClass("text-sm")
    expect(value).not.toHaveClass("font-display")
  })

  it("renders large display numerals when large is set", () => {
    render(<StatTile label="Surplus" value="Rp 1.8 jt" tone="savings" large />)

    const value = screen.getByText("Rp 1.8 jt")
    expect(value).toHaveClass("font-display")
    expect(value).toHaveClass("text-[1.35rem]")
    expect(value).toHaveClass("font-extrabold")
  })
})
