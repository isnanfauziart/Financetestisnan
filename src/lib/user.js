import "server-only"
import { supabaseAdmin } from "./supabaseAdmin"

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

async function findUserByIdentity(email, googleId) {
  const normalizedEmail = normalizeEmail(email)
  const query = supabaseAdmin.from("users").select("*")
  if (googleId) {
    return query.or(`email.eq.${normalizedEmail},google_id.eq.${googleId}`).single()
  }
  return query.eq("email", normalizedEmail).single()
}

export async function getOrCreateUser({ email, name, avatarUrl, googleId }) {
  const normalizedEmail = normalizeEmail(email)

  // Try to find existing user
  const { data: existing, error: findErr } = await findUserByIdentity(normalizedEmail, googleId)

  if (findErr && findErr.code !== "PGRST116") {
    throw new Error(`Gagal mengambil user: ${findErr.message}`)
  }

  if (existing) {
    const reactivating = Boolean(existing.deleted_at)
    if (existing.name !== name || existing.avatar_url !== avatarUrl || reactivating) {
      const changes = {
        name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }
      if (reactivating) {
        changes.google_id = googleId
        changes.deleted_at = null
      }
      await supabaseAdmin
        .from("users")
        .update(changes)
        .eq("id", existing.id)
      return reactivating ? { ...existing, ...changes } : existing
    }
    return existing
  }

  // Create new user
  const { data: newUser, error: createErr } = await supabaseAdmin
    .from("users")
    .insert({
      email: normalizedEmail,
      name,
      avatar_url: avatarUrl,
      google_id: googleId,
      tier: "free",
    })
    .select()
    .single()

  if (createErr) {
    if (createErr.code === "23505") {
      const { data: racedUser, error: retryErr } = await findUserByIdentity(normalizedEmail, googleId)
      if (retryErr) {
        throw new Error(`Gagal mengambil user hasil race: ${retryErr.message}`)
      }
      if (racedUser) {
        return racedUser
      }
    }
    throw new Error(`Gagal membuat user: ${createErr.message}`)
  }

  return newUser
}
