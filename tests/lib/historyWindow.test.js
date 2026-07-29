import { describe, expect, it } from "vitest"

import { getHistoryWindow } from "@/lib/tier"

describe("dashboard history window", () => {
  it("uses the current WIB month plus the previous three calendar months", () => {
    const firstMinuteOfAugustWib = new Date("2026-07-31T17:00:00.000Z")

    expect(getHistoryWindow("free", firstMinuteOfAugustWib)).toEqual({
      months: 4,
      from: "2026-05-01",
      to: "2026-08-31",
    })
  })

  it("does not limit paid history", () => {
    expect(getHistoryWindow("paid", new Date("2026-07-31T17:00:00.000Z"))).toEqual({
      months: null,
      from: null,
      to: null,
    })
  })
})
