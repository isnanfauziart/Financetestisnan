import { describe, expect, it } from "vitest"
import { THEME } from "@/app/dashboard/_components/constants"

function contrastAgainstWhite(hex) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
  const luminance = channels
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  return 1.05 / (luminance + 0.05)
}

describe("dashboard foreground tokens", () => {
  it("uses the approved forest-violet foundation tokens", () => {
    expect(THEME.bg).toBe("#FBF8F1")
    expect(THEME.primary).toBe("#2F6B57")
    expect(THEME.primaryDeep).toBe("#255344")
    expect(THEME.primaryBg).toBe("#E5F0EB")
    expect(THEME.smart).toBe("#6E59B5")
    expect(THEME.border).toBe("#E2D9CC")
    expect(THEME.textPrimary).toBe("#29231E")
    expect(THEME.textSecondary).toBe("#6B625A")
  })

  it("keep semantic finance colors readable on light surfaces", () => {
    for (const token of ["textTertiary", "income", "expense", "savings", "primary", "warning"]) {
      expect(contrastAgainstWhite(THEME[token]), token).toBeGreaterThanOrEqual(4.5)
    }
  })
})
