import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { useState } from "react"
import Sheet from "@/app/dashboard/_components/Sheet"

afterEach(() => cleanup())

function FocusHarness() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <button>Background action</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Focus Test">
        <button>First action</button>
        <button>Second action</button>
      </Sheet>
    </div>
  )
}

describe("Sheet focus management", () => {
  it("moves focus into the sheet when opened and restores it to the trigger when closed", () => {
    render(<FocusHarness />)

    const trigger = screen.getByRole("button", { name: "Open modal" })
    trigger.focus()
    fireEvent.click(trigger)

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus()

    fireEvent.keyDown(document.activeElement, { key: "Escape" })
    expect(trigger).toHaveFocus()
  })

  it("traps tab focus inside the sheet", () => {
    render(<FocusHarness />)

    fireEvent.click(screen.getByRole("button", { name: "Open modal" }))

    const closeButton = screen.getByRole("button", { name: "Close" })
    const firstAction = screen.getByRole("button", { name: "First action" })
    const secondAction = screen.getByRole("button", { name: "Second action" })

    closeButton.focus()
    fireEvent.keyDown(closeButton, { key: "Tab", shiftKey: true })
    expect(secondAction).toHaveFocus()

    fireEvent.keyDown(secondAction, { key: "Tab" })
    expect(closeButton).toHaveFocus()
  })
})
