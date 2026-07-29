import "server-only"
import { getToken } from "next-auth/jwt"
import { getOrCreateUser } from "./user"
import { getEffectiveEntitlement } from "./entitlement"

export async function getPaymentUser(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken || token.error === "RefreshAccessTokenError") return null
  const user = await getOrCreateUser({
    email: token.email,
    name: token.name,
    avatarUrl: token.picture,
    googleId: token.sub,
  })
  const entitlement = await getEffectiveEntitlement(user)
  return { ...user, ...entitlement }
}
