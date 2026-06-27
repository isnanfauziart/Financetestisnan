import { getToken } from "next-auth/jwt"
import { getOrCreateUser } from "./user"
import { createUserSheet } from "./sheetManager"
import { supabaseAdmin } from "./supabaseAdmin"

export async function getAuthContext(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return null
  }

  const email = token.email
  const name = token.name
  const avatarUrl = token.picture
  const googleId = token.sub

  // Get or create user in Supabase
  let user
  try {
    user = await getOrCreateUser({ email, name, avatarUrl, googleId })
  } catch (err) {
    console.error("[AuthContext] Gagal mengambil/membuat user:", err)
    throw new Error("Gagal mengambil data user dari Supabase")
  }

  // If user has no spreadsheet, create one
  let spreadsheetId = user.spreadsheet_id
  if (!spreadsheetId) {
    try {
      spreadsheetId = await createUserSheet(token.accessToken, name)

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
