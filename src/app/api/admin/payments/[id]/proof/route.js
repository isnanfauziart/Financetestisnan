import { requireAdmin } from "@/lib/adminAuth"
import { PAYMENT_BUCKET } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function GET(request, { params }) {
  const admin = await requireAdmin(request)
  if (admin.error) return Response.json({ error: admin.error }, { status: admin.error === "forbidden" ? 403 : 401 })
  const { data: payment } = await supabaseAdmin.from("payments").select("proof_url").eq("id", params.id).maybeSingle()
  if (!payment?.proof_url) return Response.json({ error: "Bukti tidak ditemukan." }, { status: 404 })
  const { data, error } = await supabaseAdmin.storage.from(PAYMENT_BUCKET).createSignedUrl(payment.proof_url, 300)
  if (error || !data?.signedUrl) return Response.json({ error: "Gagal membuka bukti." }, { status: 500 })
  return Response.redirect(data.signedUrl, 302)
}
