import "server-only"
import { getToken } from "next-auth/jwt"
import { getOrCreateUser } from "./user"

export async function getPaymentUser(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken || token.error === "RefreshAccessTokenError") return null
  return getOrCreateUser({
    email: token.email,
    name: token.name,
    avatarUrl: token.picture,
    googleId: token.sub,
  })
}

