import { describe, it, expect, beforeEach } from "vitest"
import { getTheme, resetThemeCache } from "@/lib/theme"

describe("getTheme", () => {
  beforeEach(() => resetThemeCache())

  it("returns an object with the 16 semantic token keys", () => {
    const theme = getTheme()
    expect(theme).toHaveProperty("bg")
    expect(theme).toHaveProperty("surface")
    expect(theme).toHaveProperty("surfaceWarm")
    expect(theme).toHaveProperty("textPrimary")
    expect(theme).toHaveProperty("textSecondary")
    expect(theme).toHaveProperty("textTertiary")
    expect(theme).toHaveProperty("income")
    expect(theme).toHaveProperty("expense")
    expect(theme).toHaveProperty("savings")
    expect(theme).toHaveProperty("primary")
    expect(theme).toHaveProperty("primaryDeep")
    expect(theme).toHaveProperty("warning")
    expect(theme).toHaveProperty("danger")
    expect(theme).toHaveProperty("heroBg")
    expect(theme).toHaveProperty("heroMid")
    expect(theme).toHaveProperty("heroLight")
  })

  it("returns the same cached object on repeated calls", () => {
    const a = getTheme()
    const b = getTheme()
    expect(a).toBe(b)
  })

  it("returns a fresh object after resetThemeCache()", () => {
    const a = getTheme()
    resetThemeCache()
    const b = getTheme()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it("survives being called in a non-DOM context (returns strings)", () => {
    const theme = getTheme()
    for (const v of Object.values(theme)) {
      expect(typeof v).toBe("string")
    }
  })
})
