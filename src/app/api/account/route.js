import { getPaymentUser } from "@/lib/paymentAuth"
import { PAYMENT_BUCKET } from "@/lib/payments"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function DELETE(request) {
  try {
    const user = await getPaymentUser(request)
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const { data: files, error: listError } = await supabaseAdmin.storage.from(PAYMENT_BUCKET).list(user.id)
    if (listError) throw listError
    if (files?.length) {
      const { error } = await supabaseAdmin.storage.from(PAYMENT_BUCKET)
        .remove(files.map((file) => `${user.id}/${file.name}`))
      if (error) throw error
    }
    const now = new Date().toISOString()
    const { error: paymentError } = await supabaseAdmin.from("payments").update({
      proof_url: null,
      proof_deleted_at: now,
      proof_delete_reason: "account_deleted",
      updated_at: now,
    }).eq("user_id", user.id).not("proof_url", "is", null)
    if (paymentError) throw paymentError
    const { error: userError } = await supabaseAdmin.from("users").update({
      name: null,
      avatar_url: null,
      google_id: null,
      spreadsheet_id: null,
      sheet_created_at: null,
      tier: "free",
      deleted_at: now,
      updated_at: now,
    }).eq("id", user.id)
    if (userError) throw userError
    return Response.json({ success: true })
  } catch (error) {
    console.error("[Account:DELETE]", error)
    return Response.json({ error: "Gagal menghapus akun." }, { status: 500 })
  }
}
