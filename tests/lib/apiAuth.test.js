import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getToken = vi.fn()
const getOrCreateUser = vi.fn()
const createUserSheet = vi.fn()
const getEffectiveEntitlement = vi.fn()

vi.mock("next-auth/jwt", () => ({ getToken }))
vi.mock("@/lib/user", () => ({ getOrCreateUser }))
vi.mock("@/lib/sheetManager", () => ({ createUserSheet }))
vi.mock("@/lib/entitlement", () => ({ getEffectiveEntitlement }))
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: vi.fn() } }))

describe("getAuthContext diagnostics", () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    vi.resetModules()
    getToken.mockResolvedValue({
      accessToken: "token-sensitive",
      email: "user@example.com",
      name: "User",
      picture: "avatar.png",
      sub: "google-sensitive",
    })
    getOrCreateUser.mockResolvedValue({
      id: "user-sensitive",
      email: "user@example.com",
      name: "User",
      spreadsheet_id: "sheet-sensitive",
      tier: "free",
    })
    getEffectiveEntitlement.mockResolvedValue({
      tier: "free",
      storedTier: "free",
      isAdmin: false,
      entitlementVerified: true,
    })
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public-ref.supabase.co"
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl
  })

  it("logs only non-sensitive sheet resolution facts", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})

    const { getAuthContext } = await import("@/lib/apiAuth")
    await getAuthContext(new Request("https://artami.test/api/me"))

    expect(info).toHaveBeenCalledWith("[AuthContext] Sheet diagnostic", {
      supabaseProjectRef: "public-ref",
      hasStoredSpreadsheetId: true,
      hasResolvedSpreadsheetId: true,
      legacyConnectionRequired: false,
    })
    const logged = JSON.stringify(info.mock.calls)
    expect(logged).not.toContain("user@example.com")
    expect(logged).not.toContain("user-sensitive")
    expect(logged).not.toContain("sheet-sensitive")
    expect(logged).not.toContain("token-sensitive")
    expect(logged).not.toContain("google-sensitive")
  })
})
