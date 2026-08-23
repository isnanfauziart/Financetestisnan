import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import SegmentedButtons from "@/app/dashboard/_components/SegmentedButtons"

describe("SegmentedButtons", () => {
  it("renders a radiogroup with exactly one checked segment", () => {
    render(<SegmentedButtons options={["Rutin", "Semua"]} value="Rutin" onChange={() => {}} ariaLabel="Mode analisis" />)

    const group = screen.getByRole("radiogroup", { name: "Mode analisis" })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Rutin" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("radio", { name: "Semua" })).toHaveAttribute("aria-checked", "false")
  })

  it("reports the clicked segment through onChange", () => {
    const onChange = vi.fn()
    render(<SegmentedButtons options={["Hari", "Minggu", "Bulan"]} value="Hari" onChange={onChange} ariaLabel="Periode" />)

    fireEvent.click(screen.getByRole("radio", { name: "Minggu" }))
    expect(onChange).toHaveBeenCalledWith("Minggu")
  })
})
