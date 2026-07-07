import "server-only"
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

async function getUserById(id) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(`Gagal mengambil user terbaru: ${error.message}`)
  }

  return data
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
      const freshUser = await getUserById(user.id)
      if (freshUser.spreadsheet_id) {
        user = freshUser
        spreadsheetId = freshUser.spreadsheet_id
      }
    } catch (err) {
      console.warn("[AuthContext] Gagal refresh user sebelum provisioning sheet:", err.message)
    }
  }

  if (!spreadsheetId) {
    try {
      spreadsheetId = await withRetry(
        () => createUserSheet(token.accessToken, name),
        1, 2000, "Sheets:createUserSheet"
      )

      // Save spreadsheet_id to user record
      const { data: updatedUsers, error: updateErr } = await supabaseAdmin
        .from("users")
        .update({
          spreadsheet_id: spreadsheetId,
          sheet_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .is("spreadsheet_id", null)
        .select("*")

      if (updateErr) {
        throw updateErr
      }

      if (updatedUsers && updatedUsers.length > 0) {
        user = updatedUsers[0]
      } else {
        user = await getUserById(user.id)
        spreadsheetId = user.spreadsheet_id
      }

    } catch (err) {
      console.error("[AuthContext] Gagal membuat Google Sheet:", err)
      throw new Error("Gagal membuat Google Sheet untuk user")
    }
  }

  return {
    user,
    accessToken: token.accessToken,
    spreadsheetId: spreadsheetId || user.spreadsheet_id,
    tier: user.tier || "free",
  }
}
