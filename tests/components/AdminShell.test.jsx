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
