import { describe, it, expect, vi, afterEach } from "vitest"
import { useState } from "react"
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react"
import Sheet, { closeTopSheetOnBack } from "@/app/dashboard/_components/Sheet"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const back = () =>
  act(() => {
    closeTopSheetOnBack()
  })

describe("Sheet modal history (Wave 5)", () => {
  it("registers a sentinel while open and closes on a consumed Back", () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} title="Uji">Konten</Sheet>)
    expect(window.history.state && window.history.state.__artamiSheetOpen).toBe(true)

    back()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("returns false when no sheet is open", () => {
    expect(closeTopSheetOnBack()).toBe(false)
  })

  it("does not close a dirty sheet until the discard is confirmed", () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} title="Form" dirty />)
    back()
    expect(onClose).not.toHaveBeenCalled()

    const dialog = screen.getByRole("alertdialog")
    expect(dialog).toHaveTextContent("Buang perubahan?")
    fireEvent.click(screen.getByRole("button", { name: "Buang" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("keeps the sheet open and confirm pending when the discard is declined", () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} title="Form" dirty />)
    back()
    fireEvent.click(screen.getByRole("button", { name: "Lanjut edit" }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Form" })).toBeInTheDocument()

    // Next Back targets the sheet again until it closes.
    back()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("closes stacked sheets top-first", () => {
    const onCloseA = vi.fn()
    const onCloseB = vi.fn()
    function StackHarness() {
      const [aOpen, setAOpen] = useState(true)
      const [bOpen, setBOpen] = useState(true)
      return (
        <>
          <Sheet open={aOpen} onClose={() => { onCloseA(); setAOpen(false) }} title="Lapisan A" />
          <Sheet open={bOpen} onClose={() => { onCloseB(); setBOpen(false) }} title="Lapisan B" />
        </>
      )
    }
    render(<StackHarness />)
    back()
    expect(onCloseB).toHaveBeenCalledTimes(1)
    expect(onCloseA).not.toHaveBeenCalled()

    back()
    expect(onCloseA).toHaveBeenCalledTimes(1)
  })

  it("still closes a clean sheet through Escape", () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} title="Bersih" />)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("unwinds the guard when the last sheet closes programmatically", () => {
    const onClose = vi.fn()
    const { unmount } = render(<Sheet open onClose={onClose} title="Tutup" />)
    expect(window.history.state && window.history.state.__artamiSheetOpen).toBe(true)
    act(() => unmount())
    expect(closeTopSheetOnBack()).toBe(false)
  })
})
