import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"

import PaymentTimeline, { getTimelineSteps } from "@/components/PaymentTimeline"

afterEach(() => cleanup())

describe("getTimelineSteps (Wave 9)", () => {
  it.each([
    ["awaiting_payment", 1],
    ["pending", 3],
    ["approved", 4],
    ["rejected", 4],
  ])("maps stored status %s to current step %i", (status, expectedCurrent) => {
    const steps = getTimelineSteps(status)
    const current = steps.find((step) => step.state === "current" || step.state === "rejected")
    const furthest = steps.filter((step) => step.state !== "upcoming").at(-1)

    expect(steps).toHaveLength(4)
    if (status === "approved") expect(furthest?.index).toBe(expectedCurrent)
    else expect(current?.index).toBe(expectedCurrent)
  })

  it("never shows approval before the stored status is approved", () => {
    for (const status of ["awaiting_payment", "pending"]) {
      const steps = getTimelineSteps(status)
      const final = steps.find((step) => step.key === "final")

      expect(final?.label).toBe("Disetujui")
      expect(final?.state).toBe("upcoming")
    }
  })

  it("marks the final step rejected for rejected payments", () => {
    const steps = getTimelineSteps("rejected")
    const final = steps.at(-1)

    expect(final?.key).toBe("final")
    expect(final?.label).toBe("Ditolak")
    expect(final?.state).toBe("rejected")
  })

  it("treats unknown and terminal-neutral statuses fail-closed", () => {
    expect(getTimelineSteps("revoked").every((step) => step.state !== "done" || step.index < 3)).toBe(true)
    expect(getTimelineSteps(undefined)[0].state).toBe("current")
  })
})

describe("PaymentTimeline (Wave 9)", () => {
  it("renders the four roadmap stages compactly with the pending step current", () => {
    render(<PaymentTimeline status="pending" />)

    const list = screen.getByRole("list", { name: "Status pembayaran" })
    expect(within(list).getByText("Menunggu pembayaran")).toBeInTheDocument()
    expect(within(list).getByText("Bukti diterima")).toBeInTheDocument()
    expect(within(list).getByText("Sedang ditinjau")).toBeInTheDocument()
    expect(within(list).getByText("Disetujui")).toBeInTheDocument()

    expect(within(list).getAllByRole("listitem")[2]).toHaveAttribute("aria-current", "step")
  })

  it("shows the current step label for screen readers per status", () => {
    const { unmount } = render(<PaymentTimeline status="awaiting_payment" />)
    expect(screen.getByText(/Langkah 1 dari 4: Menunggu pembayaran/)).toBeInTheDocument()
    unmount()

    render(<PaymentTimeline status="approved" />)
    expect(screen.getByText(/Langkah 4 dari 4: Disetujui/)).toBeInTheDocument()
  })

  it("renders the rejected final step from stored status only", () => {
    render(<PaymentTimeline status="rejected" />)

    expect(screen.getByText("Ditolak")).toBeInTheDocument()
    expect(screen.queryByText(/Langkah 4 dari 4: Disetujui/)).not.toBeInTheDocument()
  })
})
