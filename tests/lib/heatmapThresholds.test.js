import { describe, expect, it } from "vitest"
import { computeHeatmapThresholds, getDisplayThresholds } from "@/lib/heatmapThresholds"

describe("computeHeatmapThresholds", () => {
  it("returns null for empty or all-zero data", () => {
    expect(computeHeatmapThresholds([])).toBeNull()
    expect(computeHeatmapThresholds([0, 0, 0])).toBeNull()
    expect(computeHeatmapThresholds(undefined)).toBeNull()
  })

  it("computes quartiles over nonzero values only", () => {
    const thresholds = computeHeatmapThresholds([100_000, 200_000, 300_000, 400_000])
    expect(thresholds[0]).toBeCloseTo(175_000)
    expect(thresholds[1]).toBeCloseTo(250_000)
    expect(thresholds[2]).toBeCloseTo(325_000)
  })

  it("interpolates quartiles regardless of zeros", () => {
    // nonzero values [50k, 150k]: q1 = 50k + 0.25·(150k−50k) = 75k, etc.
    expect(computeHeatmapThresholds([0, 50_000, 0, 150_000, 0])).toEqual([75_000, 100_000, 125_000])
  })
})

describe("getDisplayThresholds", () => {
  it("falls back to defaults without data", () => {
    expect(getDisplayThresholds([])).toEqual([100000, 250000, 500000])
    expect(getDisplayThresholds([0])).toEqual([100000, 250000, 500000])
  })

  it("falls back when all nonzero values are identical", () => {
    expect(getDisplayThresholds([80_000, 80_000, 80_000])).toEqual([100000, 250000, 500000])
  })

  it("returns relative thresholds when there is spread", () => {
    const thresholds = getDisplayThresholds([50_000, 150_000, 300_000, 900_000])
    expect(thresholds[0]).toBeCloseTo(125_000)
    expect(thresholds[1]).toBeCloseTo(225_000)
    expect(thresholds[2]).toBeCloseTo(450_000)
  })

  it("honors a custom fallback", () => {
    expect(getDisplayThresholds([], [1, 2, 3])).toEqual([1, 2, 3])
  })
})
