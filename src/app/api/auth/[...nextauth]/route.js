import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { refreshAccessToken } from "@/lib/auth"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 60 * 60 * 1000
        return token
      }
      if (Date.now() < (token.accessTokenExpires ?? 0)) {
        return token
      }
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (token.error) session.error = token.error
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }