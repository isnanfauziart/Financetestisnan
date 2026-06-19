import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import useHaptics from "@/app/dashboard/_components/useHaptics"
import useHapticsPref from "@/app/dashboard/_components/useHapticsPref"

function setVibrate(value) {
  Object.defineProperty(global.navigator, "vibrate", {
    value,
    writable: true,
    configurable: true,
  })
}

describe("useHaptics", () => {
  let vibrateSpy

  beforeEach(() => {
    vibrateSpy = vi.fn()
    setVibrate(vibrateSpy)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("tap calls vibrate(10)", () => {
    const { result } = renderHook(() => useHaptics())
    result.current.tap()
    expect(vibrateSpy).toHaveBeenCalledTimes(1)
    expect(vibrateSpy).toHaveBeenCalledWith(10)
  })

  it("select calls vibrate(5)", () => {
    const { result } = renderHook(() => useHaptics())
    result.current.select()
    expect(vibrateSpy).toHaveBeenCalledWith(5)
  })

  it("success calls vibrate(50)", () => {
    const { result } = renderHook(() => useHaptics())
    result.current.success()
    expect(vibrateSpy).toHaveBeenCalledWith(50)
  })

  it("warning calls vibrate([100, 50, 100])", () => {
    const { result } = renderHook(() => useHaptics())
    result.current.warning()
    expect(vibrateSpy).toHaveBeenCalledWith([100, 50, 100])
  })

  it("error calls vibrate([200, 100, 200, 100, 200])", () => {
    const { result } = renderHook(() => useHaptics())
    result.current.error()
    expect(vibrateSpy).toHaveBeenCalledWith([200, 100, 200, 100, 200])
  })

  it("no-ops when navigator.vibrate is undefined", () => {
    setVibrate(undefined)
    const { result } = renderHook(() => useHaptics())
    expect(() => {
      result.current.tap()
      result.current.select()
      result.current.success()
      result.current.warning()
      result.current.error()
    }).not.toThrow()
  })

  it("no-ops when navigator.vibrate throws", () => {
    setVibrate(() => { throw new Error("blocked") })
    const { result } = renderHook(() => useHaptics())
    expect(() => result.current.tap()).not.toThrow()
  })
})

describe("useHapticsPref", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it("defaults to true when no stored value", () => {
    const { result } = renderHook(() => useHapticsPref())
    expect(result.current[0]).toBe(true)
  })

  it("reads stored true", () => {
    localStorage.setItem("hapticsEnabled", "true")
    const { result } = renderHook(() => useHapticsPref())
    expect(result.current[0]).toBe(true)
  })

  it("reads stored false", () => {
    localStorage.setItem("hapticsEnabled", "false")
    const { result } = renderHook(() => useHapticsPref())
    expect(result.current[0]).toBe(false)
  })

  it("writes to localStorage on set", () => {
    const { result } = renderHook(() => useHapticsPref())
    act(() => { result.current[1](false) })
    expect(localStorage.getItem("hapticsEnabled")).toBe("false")
  })

  it("toggles via setter", () => {
    const { result } = renderHook(() => useHapticsPref())
    expect(result.current[0]).toBe(true)
    act(() => { result.current[1](false) })
    expect(result.current[0]).toBe(false)
    expect(localStorage.getItem("hapticsEnabled")).toBe("false")
    act(() => { result.current[1](true) })
    expect(result.current[0]).toBe(true)
    expect(localStorage.getItem("hapticsEnabled")).toBe("true")
  })
})
