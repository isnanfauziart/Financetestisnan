import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react"
import Toast from "@/app/dashboard/_components/Toast"

afterEach(() => cleanup())

function renderToast(props = {}) {
  const onDone = vi.fn()
  const result = render(<Toast open={true} onDone={onDone} {...props} />)
  return { ...result, onDone }
}

describe("Toast", () => {
  it("renders nothing when closed", () => {
    render(<Toast open={false} onDone={() => {}}>x</Toast>)
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("renders children when open", () => {
    renderToast({ children: <span>Hello toast</span> })
    expect(screen.getByText("Hello toast")).toBeInTheDocument()
  })

  it("renders Check icon for success variant", () => {
    const { container } = renderToast({ variant: "success", children: "ok" })
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("renders X icon for error variant", () => {
    const { container } = renderToast({ variant: "error", children: "err" })
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("does not render built-in icon for celebration variant", () => {
    const { container } = renderToast({ variant: "celebration", children: "🎉" })
    expect(container.querySelector("svg")).toBeNull()
  })

  it("renders action button when action prop is provided", () => {
    const onClick = vi.fn()
    renderToast({ action: { label: "Undo", onClick } })
    fireEvent.click(screen.getByText("Undo"))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does not render action button when no action prop", () => {
    renderToast({ children: "no action" })
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("applies top-6 class for position=top", () => {
    const { container } = renderToast({ position: "top" })
    expect(container.querySelector(".top-6")).toBeInTheDocument()
  })

  it("applies top-20 class for position=top-high", () => {
    const { container } = renderToast({ position: "top-high" })
    expect(container.querySelector(".top-20")).toBeInTheDocument()
  })

  it("applies bottom-24 class for position=bottom", () => {
    const { container } = renderToast({ position: "bottom" })
    expect(container.querySelector(".bottom-24")).toBeInTheDocument()
  })

  it("applies pointer-events-none for celebration/noPointerEvents", () => {
    const { container } = renderToast({ variant: "celebration", noPointerEvents: true })
    expect(container.querySelector(".pointer-events-none")).toBeInTheDocument()
  })

  it("calls onDone after duration", () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<Toast open={true} onDone={onDone} duration={1000}>x</Toast>)
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("does not restart countdown when rerendered with the same onDone callback", () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const { rerender } = render(<Toast open={true} onDone={onDone} duration={1000}>x</Toast>)

    act(() => {
      vi.advanceTimersByTime(800)
    })

    rerender(<Toast open={true} onDone={onDone} duration={1000}>x</Toast>)

    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(onDone).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("does not call onDone when duration=0 (manual dismiss)", () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    render(<Toast open={true} onDone={onDone} duration={0}>x</Toast>)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(onDone).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("renders role=status and aria-live=polite", () => {
    renderToast()
    const el = screen.getByRole("status")
    expect(el).toHaveAttribute("aria-live", "polite")
  })
})
