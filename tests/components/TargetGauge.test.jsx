import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import TargetGauge from "@/components/TargetGauge"

describe("TargetGauge", () => {
  it("exposes the exact percentage and monetary progress to assistive technology", () => {
    render(<TargetGauge progress={550000} target={1000000} />)

    const gauge = screen.getByRole("progressbar", { name: "Progress target 55%" })
    expect(gauge).toHaveAttribute("aria-valuenow", "55")
    expect(gauge).toHaveAttribute("aria-valuemin", "0")
    expect(gauge).toHaveAttribute("aria-valuemax", "100")
    expect(gauge).toHaveAttribute("aria-valuetext", "Rp 550 rb dari Rp 1.0 jt · 55% tercapai")
  })

  it("reveals the blue to teal to green spectrum up to the current marker", () => {
    render(<TargetGauge progress={880000} target={1000000} />)

    const gauge = screen.getByRole("progressbar", { name: "Progress target 88%" })
    const fill = gauge.querySelector(".plan-gauge__fill")
    const marker = gauge.querySelector(".plan-gauge__marker")

    expect(fill).toHaveStyle({ width: "88%" })
    expect(fill.style.background).toContain("linear-gradient")
    expect(marker).toHaveStyle({ left: "88%" })
  })
})
