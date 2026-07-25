import { requireAdmin } from "@/lib/adminAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function POST(request) {
  try {
    const admin = await requireAdmin(request)
    if (admin.error) return Response.json({ error: admin.error }, { status: admin.error === "forbidden" ? 403 : 401 })
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    const reason = String(body.reason || "").trim()
    if (!email || !reason) return Response.json({ error: "Email dan alasan wajib diisi." }, { status: 400 })
    const now = new Date().toISOString()
    const { data, error } = await supabaseAdmin.from("users").update({
      tier: "paid",
      pro_restored_by: admin.email,
      pro_restored_at: now,
      pro_restore_reason: reason.slice(0, 1000),
      updated_at: now,
    }).eq("email", email).select("id,email,tier,pro_restored_at").maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ error: "Akun tidak ditemukan." }, { status: 404 })
    return Response.json({ user: data })
  } catch (error) {
    console.error("[RestorePro:POST]", error)
    return Response.json({ error: "Gagal memulihkan akses Pro." }, { status: 500 })
  }
}
