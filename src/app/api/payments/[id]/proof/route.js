import { getPaymentUser } from "@/lib/paymentAuth"
import { PAYMENT_BUCKET } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function GET(request, { params }) {
  const user = await getPaymentUser(request)
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const { data: payment } = await supabaseAdmin.from("payments")
    .select("proof_url").eq("id", params.id).eq("user_id", user.id).maybeSingle()
  if (!payment?.proof_url) return Response.json({ error: "Bukti tidak ditemukan." }, { status: 404 })
  const { data, error } = await supabaseAdmin.storage.from(PAYMENT_BUCKET)
    .createSignedUrl(payment.proof_url, 300)
  if (error || !data?.signedUrl) return Response.json({ error: "Gagal membuka bukti." }, { status: 500 })
  return Response.redirect(data.signedUrl, 302)
}
