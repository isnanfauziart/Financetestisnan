import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"
import { buildBillSummary } from "@/lib/bills"

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId } = auth

  try {
    const rows = await getSheetData(accessToken, "Tagihan!A:M", spreadsheetId).catch(() => [])
    return Response.json(buildBillSummary(rows))
  } catch (err) {
    console.error("[Bills Summary]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
