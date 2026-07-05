import { getToken } from "next-auth/jwt"
import { getOrCreateUser } from "./user"
import { createUserSheet } from "./sheetManager"
import { supabaseAdmin } from "./supabaseAdmin"

async function withRetry(fn, retries = 2, delayMs = 1000, label = "") {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries) {
        console.error(`[Retry] ${label} failed after ${retries + 1} attempts:`, err.message)
        throw err
      }
      console.warn(`[Retry] ${label} attempt ${i + 1} failed, retrying in ${delayMs}ms...`)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
}

export async function getAuthContext(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return null
  }

  if (token.error === "RefreshAccessTokenError") {
    console.error("[AuthContext] Token refresh failed, session expired")
    return null
  }

  const email = token.email
  const name = token.name
  const avatarUrl = token.picture
  const googleId = token.sub

  // Get or create user in Supabase (with retry for cold starts)
  let user
  try {
    user = await withRetry(
      () => getOrCreateUser({ email, name, avatarUrl, googleId }),
      2, 1000, "Supabase:getOrCreateUser"
    )
  } catch (err) {
    console.error("[AuthContext] Gagal mengambil/membuat user:", err)
    throw new Error("Gagal mengambil data user dari Supabase")
  }

  // If user has no spreadsheet, create one
  let spreadsheetId = user.spreadsheet_id
  if (!spreadsheetId) {
    try {
      spreadsheetId = await withRetry(
        () => createUserSheet(token.accessToken, name),
        1, 2000, "Sheets:createUserSheet"
      )

      // Save spreadsheet_id to user record
      await supabaseAdmin
        .from("users")
        .update({
          spreadsheet_id: spreadsheetId,
          sheet_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      user.spreadsheet_id = spreadsheetId
    } catch (err) {
      console.error("[AuthContext] Gagal membuat Google Sheet:", err)
      throw new Error("Gagal membuat Google Sheet untuk user")
    }
  }

  return {
    user,
    accessToken: token.accessToken,
    spreadsheetId: user.spreadsheet_id,
    tier: user.tier || "free",
  }
}
