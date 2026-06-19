export async function refreshAccessToken(token) {
  try {
    const url = "https://oauth2.googleapis.com/token"
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    })
    const refreshed = await res.json()
    if (!res.ok) throw refreshed
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + (refreshed.expires_in * 1000),
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    }
  } catch (err) {
    console.error("Google token refresh failed", err)
    return { ...token, error: "RefreshAccessTokenError" }
  }
}
