import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import Skeleton from "@/app/dashboard/_components/Skeleton"

describe("Skeleton", () => {
  it("renders a div with the shimmer-bg class", () => {
    const { container } = render(<Skeleton />)
    const el = container.firstChild
    expect(el.tagName).toBe("DIV")
    expect(el.className).toMatch(/shimmer-bg/)
    expect(el.className).toMatch(/rounded-2xl/)
  })

  it("defaults to tile variant height (h-[110px])", () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild.className).toMatch(/h-\[110px\]/)
  })

  it("renders the hero variant (h-[220px])", () => {
    const { container } = render(<Skeleton variant="hero" />)
    expect(container.firstChild.className).toMatch(/h-\[220px\]/)
  })

  it("renders the chart variant (h-[180px])", () => {
    const { container } = render(<Skeleton variant="chart" />)
    expect(container.firstChild.className).toMatch(/h-\[180px\]/)
  })

  it("renders the card variant (h-[140px])", () => {
    const { container } = render(<Skeleton variant="card" />)
    expect(container.firstChild.className).toMatch(/h-\[140px\]/)
  })

  it("renders the row variant (h-[64px])", () => {
    const { container } = render(<Skeleton variant="row" />)
    expect(container.firstChild.className).toMatch(/h-\[64px\]/)
  })

  it("appends extra className when provided", () => {
    const { container } = render(<Skeleton variant="hero" className="col-span-2 row-span-2" />)
    const cls = container.firstChild.className
    expect(cls).toMatch(/h-\[220px\]/)
    expect(cls).toMatch(/col-span-2/)
    expect(cls).toMatch(/row-span-2/)
  })

  it("is aria-hidden for accessibility", () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild.getAttribute("aria-hidden")).toBe("true")
  })
})
