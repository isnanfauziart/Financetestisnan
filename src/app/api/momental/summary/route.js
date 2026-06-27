import { getToken } from "next-auth/jwt"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const accessToken = token.accessToken

  try {
    const rows = await getSheetData(accessToken, "Momental!A:K").catch(() => [])
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r[0] || !r[1]) continue

      const id = String(r[0] || "").trim()
      const nama = String(r[1] || "").trim()
      const tipe = String(r[2] || "custom").trim()
      const tanggalMulai = String(r[3] || "").trim()
      const tanggalSelesai = String(r[4] || "").trim()
      const totalBudget = parseRupiah(r[5] || 0)
      const status = String(r[7] || "planning").trim()

      if (status === "archived") continue

      // Compute effective status
      const start = new Date(tanggalMulai)
      const end = new Date(tanggalSelesai)
      start.setHours(0, 0, 0, 0)
      end.setHours(0, 0, 0, 0)

      let effectiveStatus = status
      if (today < start) effectiveStatus = "planning"
      else if (today > end) effectiveStatus = "completed"
      else effectiveStatus = "active"

      if (effectiveStatus !== "active") continue

      // Compute days remaining
      const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24))

      events.push({ id, nama, tipe, totalBudget, effectiveStatus, daysRemaining })
    }

    return Response.json({ events })
  } catch (err) {
    console.error("[Momental Summary]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
