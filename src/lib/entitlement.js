import "server-only"
import { normalizeTier } from "./tier"
import { supabaseAdmin } from "./supabaseAdmin"

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

export async function getEffectiveEntitlement(user) {
  const storedTier = normalizeTier(user?.tier)
  const email = normalizeEmail(user?.email)

  if (!email) {
    return {
      tier: storedTier,
      storedTier,
      isAdmin: false,
      entitlementVerified: false,
    }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("admins")
      .select("email")
      .ilike("email", email)
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const isAdmin = Boolean(data)
    return {
      tier: isAdmin || storedTier === "paid" ? "paid" : "free",
      storedTier,
      isAdmin,
      entitlementVerified: true,
    }
  } catch (error) {
    console.error("[Entitlement] Admin lookup failed:", error)
    return {
      tier: storedTier,
      storedTier,
      isAdmin: false,
      entitlementVerified: false,
    }
  }
}
