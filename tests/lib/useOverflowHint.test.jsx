import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { render, act } from "@testing-library/react"
import useOverflowHint from "@/app/dashboard/_components/useOverflowHint"

let observers

beforeEach(() => {
  observers = []
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
      this.observed = []
    }
    observe(element) {
      this.observed.push(element)
      observers.push(this)
    }
    disconnect() {
      this.disconnected = true
    }
  }
})

afterEach(() => {
  delete global.ResizeObserver
})

// jsdom performs no layout, so scrollWidth/clientWidth are stubbed. Getters
// bound to a mutable object survive re-renders (the ref callback re-attaches
// them with the same live binding), so resize-driven updates can be simulated.
function Probe({ dims }) {
  const [ref, overflows] = useOverflowHint()
  return (
    <div>
      <div
        ref={element => {
          ref.current = element
          if (!element) return
          Object.defineProperty(element, "scrollWidth", { get: () => dims.scroll, configurable: true })
          Object.defineProperty(element, "clientWidth", { get: () => dims.client, configurable: true })
        }}
        data-testid="probe"
      />
      <span data-testid="overflows">{String(overflows)}</span>
    </div>
  )
}

describe("useOverflowHint", () => {
  it("reports overflowing content as true on mount", () => {
    const { getByTestId } = render(<Probe dims={{ scroll: 300, client: 100 }} />)

    expect(getByTestId("overflows")).toHaveTextContent("true")
  })

  it("reports fitting content as false on mount", () => {
    const { getByTestId } = render(<Probe dims={{ scroll: 100, client: 400 }} />)

    expect(getByTestId("overflows")).toHaveTextContent("false")
  })

  it("re-measures when the observed element resizes", () => {
    const dims = { scroll: 100, client: 400 }
    const { getByTestId } = render(<Probe dims={dims} />)

    expect(getByTestId("overflows")).toHaveTextContent("false")

    dims.scroll = 900
    act(() => {
      observers.forEach(observer => observer.callback())
    })

    expect(getByTestId("overflows")).toHaveTextContent("true")
  })

  it("observes exactly one element through one ResizeObserver", () => {
    const { getByTestId } = render(<Probe dims={{ scroll: 300, client: 100 }} />)

    const probe = getByTestId("probe")
    expect(observers).toHaveLength(1)
    expect(observers[0].observed).toEqual([probe])
  })

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<Probe dims={{ scroll: 300, client: 100 }} />)

    unmount()

    expect(observers[0].disconnected).toBe(true)
  })

  it("does not throw when ResizeObserver is unavailable", () => {
    delete global.ResizeObserver

    expect(() => render(<Probe dims={{ scroll: 300, client: 100 }} />)).not.toThrow()
  })
})
