import { getAuthContext } from "@/lib/apiAuth"
import { isLegacySheetOwner, isValidSpreadsheetId } from "@/lib/legacySheet"
import { ensureArtamiSheetSchema } from "@/lib/sheetManager"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isLegacySheetOwner(auth.user?.email)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  if (auth.user?.spreadsheet_id) {
    return Response.json({ error: "Spreadsheet sudah terhubung" }, { status: 409 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Payload tidak valid" }, { status: 400 })
  }

  const spreadsheetId = String(body?.spreadsheetId || "").trim()
  if (!isValidSpreadsheetId(spreadsheetId)) {
    return Response.json({ error: "Spreadsheet ID tidak valid" }, { status: 400 })
  }

  try {
    const schemaResult = await ensureArtamiSheetSchema(auth.accessToken, spreadsheetId)

    const { data: updatedUsers, error: updateErr } = await supabaseAdmin
      .from("users")
      .update({
        spreadsheet_id: spreadsheetId,
        sheet_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", auth.user.id)
      .is("spreadsheet_id", null)
      .select("id, spreadsheet_id")

    if (updateErr) {
      throw updateErr
    }

    if (!updatedUsers || updatedUsers.length === 0) {
      return Response.json({ error: "Spreadsheet sudah terhubung" }, { status: 409 })
    }

    return Response.json({
      success: true,
      spreadsheetId,
      addedTabs: schemaResult.addedTabs,
    })
  } catch (err) {
    console.error("[ConnectLegacySheet]", err)
    return Response.json({ error: "Gagal menghubungkan spreadsheet" }, { status: 500 })
  }
}
