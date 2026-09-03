import { describe, expect, it } from "vitest"

import { getHeroMorphTransform, getHeroProductTravel } from "@/components/landing/heroMorph"

describe("getHeroMorphTransform", () => {
  it("aligns the source center and dimensions with a moving dashboard target", () => {
    const source = { left: 100, top: 180, width: 200, height: 100 }
    const target = { left: 500, top: 720, width: 120, height: 60 }

    expect(getHeroMorphTransform(source, target, -500)).toEqual({
      x: 360,
      y: 20,
      scaleX: 0.6,
      scaleY: 0.6,
    })
  })

  it("keeps a safe scale when a source has not been laid out", () => {
    const source = { left: 0, top: 0, width: 0, height: 0 }
    const target = { left: 10, top: 20, width: 80, height: 40 }

    expect(getHeroMorphTransform(source, target, 0)).toMatchObject({
      scaleX: 1,
      scaleY: 1,
    })
  })

  it("places a laptop-sized dashboard fully inside the sticky viewport", () => {
    const travelY = getHeroProductTravel(
      { top: 744, height: 632 },
      { viewportHeight: 768, topInset: 72, bottomInset: 24 },
    )

    expect(travelY).toBe(-652)
    expect(744 + travelY).toBeGreaterThanOrEqual(72)
    expect(744 + travelY + 632).toBeLessThanOrEqual(744)
  })
})
