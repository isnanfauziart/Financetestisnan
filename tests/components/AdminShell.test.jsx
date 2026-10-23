import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

vi.mock("@/app/admin/AdminPaymentsClient", () => ({
  default: () => <div data-testid="payments-view">payments</div>,
}))
vi.mock("@/app/admin/AdminUsersClient", () => ({
  default: () => <div data-testid="users-view">users</div>,
}))
vi.mock("@/app/admin/AdminFeatureControls", () => ({
  default: ({ onSuccess }) => <button type="button" onClick={() => onSuccess?.("Feature updated")}>features</button>,
}))

describe("AdminShell", () => {
  beforeEach(() => window.history.pushState({}, "", "/admin"))

  it("shows the pending-review badge and overview stats", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      pendingCount: 2,
      pendingAmount: 80000,
      approvedCount: 5,
      approvedRevenue: 200000,
      totalUsers: 10,
      paidUsers: 3,
    }), { status: 200 }))
    const { default: AdminShell } = await import("@/app/admin/AdminShell")
    render(<AdminShell />)

    expect(await screen.findByText("Menunggu review")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /pembayaran/i })).toHaveTextContent("2")
    expect(screen.getByText(/200\.000/)).toBeInTheDocument()
    expect(screen.getByText(/dari 10 pengguna/i)).toBeInTheDocument()

    fetchMock.mockRestore()
  })

  it("renders one main landmark and one h1, and moves between tabs with arrow keys", async () => {
    const { default: AdminShell } = await import("@/app/admin/AdminShell")
    render(<AdminShell />)

    expect(screen.getAllByRole("main")).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)

    const paymentsTab = screen.getByRole("tab", { name: /pembayaran/i })
    paymentsTab.focus()
    fireEvent.keyDown(paymentsTab, { key: "ArrowRight" })

    expect(screen.getByTestId("users-view")).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Pengguna" }))
    expect(screen.getByRole("tab", { name: /pembayaran/i })).toHaveAttribute("tabIndex", "-1")
  })

  it("switches workspace tabs and keeps the selected tab in the URL", async () => {
    const { default: AdminShell } = await import("@/app/admin/AdminShell")
    render(<AdminShell />)

    expect(screen.getByTestId("payments-view")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("tab", { name: "Pengguna" }))

    expect(screen.getByTestId("users-view")).toBeInTheDocument()
    expect(window.location.search).toBe("?tab=users")

    fireEvent.click(screen.getByRole("tab", { name: "Kontrol Fitur" }))
    expect(screen.getByText("features")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "features" }))
    expect(screen.getByRole("status")).toHaveTextContent("Feature updated")
  })
})
