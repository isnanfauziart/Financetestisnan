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

  // Regression: dirty flips and parent re-renders mid-open used to re-run the
  // history effect, whose cleanup called history.back() and fired a phantom
  // popstate — spontaneously opening "Buang perubahan?" (or auto-closing a
  // clean sheet) with no Back press. The sentinel must register once per open.
  it("does not fire a phantom Back when dirty flips false → true mid-open", () => {
    const onClose = vi.fn()
    function Harness() {
      const [dirty, setDirty] = useState(false)
      return (
        <>
          <button onClick={() => setDirty(true)}>Jadikan kotor</button>
          <Sheet open onClose={onClose} title="Form" dirty={dirty} />
        </>
      )
    }
    render(<Harness />)
    const historyLength = window.history.length

    fireEvent.click(screen.getByRole("button", { name: "Jadikan kotor" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(window.history.length).toBe(historyLength)
  })

  it("still guards Back with the discard confirm after dirty flips mid-open", () => {
    const onClose = vi.fn()
    function Harness() {
      const [dirty, setDirty] = useState(false)
      return (
        <>
          <button onClick={() => setDirty(true)}>Jadikan kotor</button>
          <Sheet open onClose={onClose} title="Form" dirty={dirty} />
        </>
      )
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Jadikan kotor" }))

    back()

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Buang perubahan?")
    expect(onClose).not.toHaveBeenCalled()
  })

  it("does not fire a phantom Back when the parent passes a new onClose identity mid-open", () => {
    const onClose = vi.fn()
    function Harness({ onClose: close }) {
      return <Sheet open onClose={close} title="Form" />
    }
    const { rerender } = render(<Harness onClose={onClose} />)
    const historyLength = window.history.length

    rerender(<Harness onClose={() => onClose()} />)

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(window.history.length).toBe(historyLength)
  })

  it("stays open when dirty flips true → false mid-open", () => {
    const onClose = vi.fn()
    function Harness() {
      const [dirty, setDirty] = useState(true)
      return (
        <>
          <button onClick={() => setDirty(false)}>Bersihkan</button>
          <Sheet open onClose={onClose} title="Form" dirty={dirty} />
        </>
      )
    }
    render(<Harness />)
    const historyLength = window.history.length

    fireEvent.click(screen.getByRole("button", { name: "Bersihkan" }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog", { name: "Form" })).toBeInTheDocument()
    expect(window.history.length).toBe(historyLength)
  })
})
