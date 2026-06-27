import { getAuthContext } from "@/lib/apiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { user } = auth

  try {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("user_id", user.id)
      .select("id")

    if (error) {
      console.error("[DeleteTransactions] Error:", error.message)
      return Response.json({ error: "Gagal menghapus transaksi" }, { status: 500 })
    }

    return Response.json({
      success: true,
      deletedCount: data?.length || 0,
      message: `Berhasil menghapus ${data?.length || 0} transaksi. Silakan jalankan migrasi ulang.`
    })
  } catch (err) {
    console.error("[DeleteTransactions]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
