import { describe, expect, it } from "vitest"
import { getEffectiveUserName } from "@/lib/userDisplayName"

describe("getEffectiveUserName", () => {
  it("prefers the saved name, then Google name, then email", () => {
    expect(getEffectiveUserName({ savedName: "  Siti  ", googleName: "Google User", email: "siti@example.com" })).toBe("Siti")
    expect(getEffectiveUserName({ savedName: "  ", googleName: "  Google User  ", email: "siti@example.com" })).toBe("Google User")
    expect(getEffectiveUserName({ savedName: "", googleName: "", email: "  siti@example.com  " })).toBe("siti@example.com")
  })

  it("returns an empty string when every source is empty", () => {
    expect(getEffectiveUserName({ savedName: " ", googleName: null, email: "" })).toBe("")
  })
})
