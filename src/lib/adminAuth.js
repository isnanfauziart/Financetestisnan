import "server-only"
import { getToken } from "next-auth/jwt"
import { supabaseAdmin } from "./supabaseAdmin"

export async function requireAdmin(request) {
  const token = await getToken({ req: request })
  const email = String(token?.email || "").trim().toLowerCase()
  if (!token?.accessToken || !email) return { error: "unauthorized" }
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? { email } : { error: "forbidden" }
}
