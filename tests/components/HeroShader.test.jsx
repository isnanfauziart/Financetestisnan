import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import HeroShader, {
  clampShaderPixelRatio,
  shouldAnimateShader,
} from "@/components/landing/HeroShader"

function createWebGLContext() {
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteProgram: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    getUniformLocation: vi.fn(() => ({})),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    viewport: vi.fn(),
    useProgram: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    drawArrays: vi.fn(),
    deleteBuffer: vi.fn(),
  }
}

describe("HeroShader", () => {
  let frameCallbacks
  let getContextSpy

  beforeEach(() => {
    frameCallbacks = new Map()
    let frameId = 0
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => {
      frameId += 1
      frameCallbacks.set(frameId, callback)
      return frameId
    }))
    vi.stubGlobal("cancelAnimationFrame", vi.fn((id) => frameCallbacks.delete(id)))
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
  })

  afterEach(() => {
    getContextSpy?.mockRestore()
    vi.unstubAllGlobals()
  })

  it("caps the render density and respects reduced motion or offscreen state", () => {
    expect(clampShaderPixelRatio(3)).toBe(1)
    expect(clampShaderPixelRatio(1)).toBe(1)
    expect(shouldAnimateShader({ reducedMotion: false, hidden: false, visible: true })).toBe(true)
    expect(shouldAnimateShader({ reducedMotion: true, hidden: false, visible: true })).toBe(false)
    expect(shouldAnimateShader({ reducedMotion: false, hidden: true, visible: true })).toBe(false)
    expect(shouldAnimateShader({ reducedMotion: false, hidden: false, visible: false })).toBe(false)
  })

  it("limits drawing to about 30 frames per second", () => {
    const gl = createWebGLContext()
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl)

    render(<HeroShader />)
    const firstFrame = [...frameCallbacks.values()].at(-1)
    act(() => firstFrame(0))
    const secondFrame = [...frameCallbacks.values()].at(-1)
    act(() => secondFrame(16))
    expect(gl.drawArrays).toHaveBeenCalledTimes(1)

    const thirdFrame = [...frameCallbacks.values()].at(-1)
    act(() => thirdFrame(34))
    expect(gl.drawArrays).toHaveBeenCalledTimes(2)
  })

  it("stops rendering when the hero canvas leaves the viewport", () => {
    let intersectionCallback
    const disconnect = vi.fn()
    vi.stubGlobal("IntersectionObserver", vi.fn(function Observer(callback) {
      intersectionCallback = callback
      this.observe = vi.fn()
      this.disconnect = disconnect
    }))
    const gl = createWebGLContext()
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl)

    const { unmount } = render(<HeroShader />)
    act(() => intersectionCallback([{ isIntersecting: false }]))

    expect(cancelAnimationFrame).toHaveBeenCalled()
    unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it("keeps the CSS fallback when WebGL is unavailable", () => {
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)

    const { container } = render(<HeroShader />)

    expect(container.querySelector("[data-hero-shader]")).toBeInTheDocument()
    expect(container.querySelector("canvas")).not.toHaveClass("is-ready")
  })

  it("renders, pauses while hidden, and restores after context loss", () => {
    const gl = createWebGLContext()
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl)

    const { container } = render(<HeroShader />)
    const canvas = container.querySelector("canvas")
    const firstFrame = [...frameCallbacks.values()][0]

    act(() => firstFrame(120))
    expect(canvas).toHaveClass("is-ready")
    expect(gl.drawArrays).toHaveBeenCalled()

    Object.defineProperty(document, "hidden", { configurable: true, value: true })
    act(() => document.dispatchEvent(new Event("visibilitychange")))
    expect(cancelAnimationFrame).toHaveBeenCalled()

    const contextLost = new Event("webglcontextlost", { cancelable: true })
    act(() => canvas.dispatchEvent(contextLost))
    expect(contextLost.defaultPrevented).toBe(true)
    expect(canvas).not.toHaveClass("is-ready")

    Object.defineProperty(document, "hidden", { configurable: true, value: false })
    act(() => canvas.dispatchEvent(new Event("webglcontextrestored")))
    const restoredFrame = [...frameCallbacks.values()].at(-1)
    act(() => restoredFrame(240))
    expect(canvas).toHaveClass("is-ready")
  })

  it("releases partial GPU resources when shader compilation fails", () => {
    const gl = createWebGLContext()
    gl.getShaderParameter
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl)

    const { container } = render(<HeroShader />)

    expect(container.querySelector("canvas")).not.toHaveClass("is-ready")
    expect(gl.deleteShader).toHaveBeenCalledTimes(2)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  it("releases the linked program and buffer on unmount", () => {
    const gl = createWebGLContext()
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl)

    const { unmount } = render(<HeroShader />)
    unmount()

    expect(gl.deleteBuffer).toHaveBeenCalledTimes(1)
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1)
  })
})
