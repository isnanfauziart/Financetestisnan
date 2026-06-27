import { supabaseAdmin } from "./supabaseAdmin"

export async function getOrCreateUser({ email, name, avatarUrl, googleId }) {
  // Try to find existing user
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email)
    .single()

  if (existing) {
    // Update avatar/name if changed
    if (existing.name !== name || existing.avatar_url !== avatarUrl) {
      await supabaseAdmin
        .from("users")
        .update({ name, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
    }
    return existing
  }

  // Create new user
  const { data: newUser, error: createErr } = await supabaseAdmin
    .from("users")
    .insert({
      email,
      name,
      avatar_url: avatarUrl,
      google_id: googleId,
      tier: "free",
    })
    .select()
    .single()

  if (createErr) {
    throw new Error(`Gagal membuat user: ${createErr.message}`)
  }

  return newUser
}
