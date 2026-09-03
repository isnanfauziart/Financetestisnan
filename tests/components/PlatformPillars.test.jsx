import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import PlatformPillars from "@/components/landing/PlatformPillars"

describe("PlatformPillars", () => {
  it("starts on the first pillar and activates another pillar by hover", () => {
    render(<PlatformPillars />)

    const readPatterns = screen.getByRole("button", { name: /Baca pola/i })
    const plan = screen.getByRole("button", { name: /Susun rencana/i })

    expect(readPatterns).toHaveAttribute("aria-pressed", "true")
    fireEvent.mouseEnter(plan.closest("article"))
    expect(plan).toHaveAttribute("aria-pressed", "true")
    expect(readPatterns).toHaveAttribute("aria-pressed", "false")
  })

  it("supports focus and click activation for keyboard and touch users", () => {
    render(<PlatformPillars />)

    const control = screen.getByRole("button", { name: /Tetap punya kendali/i })
    const plan = screen.getByRole("button", { name: /Susun rencana/i })

    fireEvent.focus(control)
    expect(control).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(plan)
    expect(plan).toHaveAttribute("aria-pressed", "true")
    expect(plan.closest("article")).toHaveClass("is-active", "pillar-card--lilac")
  })
})
