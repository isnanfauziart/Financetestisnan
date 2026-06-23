import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { useState } from "react"
import Sheet from "@/app/dashboard/_components/Sheet"

afterEach(() => cleanup())

function TestHarness({ initiallyOpen = true, onClose, ...rest }) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <Sheet
      open={open}
      onClose={() => {
        setOpen(false)
        onClose?.()
      }}
      title="Test Title"
      {...rest}
    >
      <p>Test body content</p>
    </Sheet>
  )
}

describe("Sheet", () => {
  it("renders nothing when closed", () => {
    render(<TestHarness initiallyOpen={false} />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("renders a dialog with the title when open", () => {
    render(<TestHarness />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Test Title")).toBeInTheDocument()
  })

  it("renders subtitle when provided", () => {
    render(<TestHarness subtitle="Test Subtitle" />)
    expect(screen.getByText("Test Subtitle")).toBeInTheDocument()
  })

  it("renders custom header when provided", () => {
    render(<TestHarness header={<div>Custom Header</div>} />)
    expect(screen.getByText("Custom Header")).toBeInTheDocument()
  })

  it("renders footer when provided", () => {
    render(<TestHarness footer={<div>Footer Area</div>} />)
    expect(screen.getByText("Footer Area")).toBeInTheDocument()
  })

  it("renders children in the body", () => {
    render(<TestHarness />)
    expect(screen.getByText("Test body content")).toBeInTheDocument()
  })

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn()
    render(<TestHarness onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("Close"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("calls onClose when ESC is pressed", () => {
    const onClose = vi.fn()
    render(<TestHarness onClose={onClose} />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("does not call onClose on ESC when closeOnEsc is false", () => {
    const onClose = vi.fn()
    render(<TestHarness onClose={onClose} closeOnEsc={false} />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).not.toHaveBeenCalled()
  })

  it("restores body overflow after closing", () => {
    const { unmount } = render(<TestHarness />)
    expect(document.body.style.overflow).toBe("hidden")
    unmount()
    expect(document.body.style.overflow).not.toBe("hidden")
  })

  it("centers on mobile when position is center", () => {
    render(<TestHarness position="center" />)
    const backdrop = screen.getByRole("dialog")
    expect(backdrop.className).toContain("items-center")
    expect(backdrop.className).not.toContain("items-end")
  })

  it("defaults to bottom position (items-end on mobile)", () => {
    render(<TestHarness />)
    const backdrop = screen.getByRole("dialog")
    expect(backdrop.className).toContain("items-end")
  })
})
