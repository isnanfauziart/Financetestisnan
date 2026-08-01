import { describe, expect, it, vi } from "vitest"

const REQUIRED = {
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  NEXTAUTH_URL: "https://artami.example",
  NEXTAUTH_SECRET: "auth-secret",
  LEGACY_SHEET_OWNER_EMAIL: "owner@example.com",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "browser-client",
  NEXT_PUBLIC_GOOGLE_PICKER_API_KEY: "picker-key",
  NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER: "123456",
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
}

describe("environment validation", () => {
  it("reports missing required names without exposing values", async () => {
    const { getEnvironmentStatus } = await import("@/lib/env")
    const status = getEnvironmentStatus({ ...REQUIRED, NEXTAUTH_SECRET: "" })

    expect(status.missing).toEqual(["NEXTAUTH_SECRET"])
    expect(JSON.stringify(status)).not.toContain("service-key")
  })

  it("throws in production and warns in development", async () => {
    const { validateEnvironment } = await import("@/lib/env")
    const warn = vi.fn()

    expect(() => validateEnvironment({ ...REQUIRED, NEXTAUTH_SECRET: "" }, { nodeEnv: "production", warn })).toThrow(/NEXTAUTH_SECRET/)

    expect(validateEnvironment({ ...REQUIRED, NEXTAUTH_SECRET: "" }, { nodeEnv: "development", warn })).toMatchObject({
      missing: ["NEXTAUTH_SECRET"],
      valid: false,
    })
    expect(warn).toHaveBeenCalledOnce()
  })
})
