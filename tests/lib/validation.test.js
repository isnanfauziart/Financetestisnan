import { describe, expect, it } from "vitest"

describe("request validation helpers", () => {
  it("parses JSON once and rejects oversized or malformed payloads", async () => {
    const { readJsonBody } = await import("@/lib/validation")
    const valid = await readJsonBody(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    }))
    expect(valid).toEqual({ enabled: true })

    await expect(readJsonBody(new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    }))).rejects.toMatchObject({ code: "INVALID_JSON" })

    await expect(readJsonBody(new Request("http://localhost", {
      method: "POST",
      body: "123456789",
    }), { maxBytes: 4 })).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" })
  })

  it("validates bounded strings, booleans, and enums", async () => {
    const { boundedString, booleanValue, objectValue, oneOf } = await import("@/lib/validation")
    expect(boundedString(" budgets ", { required: true, max: 20 })).toBe("budgets")
    expect(booleanValue(false)).toBe(false)
    expect(oneOf("global", ["global", "users"])).toBe("global")
    expect(objectValue({ enabled: true })).toEqual({ enabled: true })
    expect(() => boundedString("", { required: true, max: 20 })).toThrow("INVALID_STRING")
    expect(() => boundedString("x", { max: 0 })).toThrow("INVALID_STRING")
    expect(() => booleanValue("false")).toThrow("INVALID_BOOLEAN")
    expect(() => oneOf("segment", ["global", "users"])).toThrow("INVALID_OPTION")
    expect(() => objectValue(null)).toThrow("INVALID_OBJECT")
  })
})
