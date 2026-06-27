import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId } = auth

  try {
    const rows = await getSheetData(accessToken, "Tagihan!A:M", spreadsheetId).catch(() => [])
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming = []
    const overdue = []

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      if (!r || !r[0] || !r[1]) continue
      const aktif = String(r[9] || "TRUE").trim().toUpperCase() === "TRUE"
      if (!aktif) continue

      const id = String(r[0] || "").trim()
      const nama = String(r[1] || "").trim()
      const jumlah = parseRupiah(r[2] || 0)
      const tipe = String(r[3] || "expense").trim().toLowerCase()
      const kategoriBill = String(r[4] || "").trim()
      const frekuensi = String(r[6] || "monthly").trim().toLowerCase()
      const tanggalJatuhTempo = parseInt(r[7], 10) || 1
      const akunBank = String(r[8] || "").trim()

      // Compute next due date (monthly)
      let nextDue = new Date(today.getFullYear(), today.getMonth(), tanggalJatuhTempo)
      if (nextDue < today) {
        nextDue = new Date(today.getFullYear(), today.getMonth() + 1, tanggalJatuhTempo)
      }
      nextDue.setHours(0, 0, 0, 0)
      const daysUntilDue = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24))
      let status = "upcoming"
      if (daysUntilDue < 0) status = "overdue"
      else if (daysUntilDue === 0) status = "due_today"
      else if (daysUntilDue <= 1) status = "due_soon"

      const bill = { id, nama, jumlah, tipe, kategoriBill, frekuensi, tanggalJatuhTempo, akunBank, daysUntilDue, status, nextDueDate: nextDue.toISOString().split("T")[0] }
      if (status === "overdue") overdue.push(bill)
      else upcoming.push(bill)
    }

    upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    overdue.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

    return Response.json({
      upcoming,
      overdue,
      totalUpcoming: upcoming.reduce((s, b) => s + b.jumlah, 0),
      totalOverdue: overdue.reduce((s, b) => s + b.jumlah, 0),
      overdueCount: overdue.length,
    })
  } catch (err) {
    console.error("[Bills Summary]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
