import { describe, it, expect, afterEach } from "vitest"
import { cleanup, render } from "@testing-library/react"
import BudgetProgressBar from "@/components/BudgetProgressBar"

afterEach(() => cleanup())

describe("BudgetProgressBar pace marker", () => {
  it("does not render a marker when expected spending is unknown", () => {
    const { container } = render(
      <BudgetProgressBar spent={500000} limit={1000000} expectedSpent={null} paceStatus={null} />,
    )

    expect(container.querySelector("[data-budget-pace-marker]")).toBeNull()
  })

  it("renders a marker for a finite past or future pace reference", () => {
    const { container, rerender } = render(
      <BudgetProgressBar spent={500000} limit={1000000} expectedSpent={250000} paceStatus="faster" />,
    )

    expect(container.querySelector("[data-budget-pace-marker]")).toHaveStyle({ left: "25%" })

    rerender(
      <BudgetProgressBar spent={500000} limit={1000000} expectedSpent={750000} paceStatus="slower" />,
    )

    expect(container.querySelector("[data-budget-pace-marker]")).toHaveStyle({ left: "75%" })
  })
})
