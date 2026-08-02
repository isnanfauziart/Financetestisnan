import "server-only"
import { getToken } from "next-auth/jwt"
import { getOrCreateUser } from "./user"
import { getEffectiveEntitlement } from "./entitlement"
import { resolveFeatureAccess } from "./featureFlags"
import { recordAuthenticatedActivity } from "./activity"

export async function getPaymentUser(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken || token.error === "RefreshAccessTokenError") return null
  const user = await getOrCreateUser({
    email: token.email,
    name: token.name,
    avatarUrl: token.picture,
    googleId: token.sub,
  })
  try {
    const recordedAt = await recordAuthenticatedActivity(user.id, user.last_seen_at)
    if (recordedAt) user.last_seen_at = recordedAt
  } catch (err) {
    console.warn("[PaymentAuth] Gagal mencatat aktivitas user:", err.message)
  }
  const entitlement = await getEffectiveEntitlement(user)
  const featureAccess = await resolveFeatureAccess({ ...user, ...entitlement }, { entitlement })
  return { ...user, ...entitlement, featureAccess, featureAvailability: featureAccess.availability }
}
