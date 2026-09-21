import { getAuthContext } from "@/lib/apiAuth"
import { isLegacySheetOwner, isValidSpreadsheetId } from "@/lib/legacySheet"
import { ensureArtamiSheetSchema, fetchSpreadsheetFileInfo } from "@/lib/sheetManager"
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
  const existingSpreadsheetId = String(auth.user?.spreadsheet_id || "").trim()
  if (existingSpreadsheetId && existingSpreadsheetId !== spreadsheetId) {
    return Response.json({ error: "Spreadsheet berbeda sudah terhubung" }, { status: 409 })
  }

  try {
    const schemaResult = await ensureArtamiSheetSchema(auth.accessToken, spreadsheetId)

    // Ownership metadata (Wave 2): backfill the file name and open link from
    // Drive the first time the legacy file is connected. Failure here is
    // non-fatal; the connection endpoint backfills lazily later.
    let spreadsheetName = null
    let spreadsheetUrl = null
    try {
      const info = await fetchSpreadsheetFileInfo(auth.accessToken, spreadsheetId)
      spreadsheetName = info.name
      spreadsheetUrl = info.url
    } catch (err) {
      console.warn("[ConnectLegacySheet] Gagal membaca info spreadsheet:", err.message)
    }

    if (!existingSpreadsheetId) {
      const { data: updatedUsers, error: updateErr } = await supabaseAdmin
        .from("users")
        .update({
          spreadsheet_id: spreadsheetId,
          spreadsheet_name: spreadsheetName,
          spreadsheet_url: spreadsheetUrl,
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
    } else {
      // Same-file reconnection: refresh the cached name/url only.
      const { error: metaErr } = await supabaseAdmin
        .from("users")
        .update({
          spreadsheet_name: spreadsheetName,
          spreadsheet_url: spreadsheetUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auth.user.id)
        .eq("spreadsheet_id", spreadsheetId)

      if (metaErr) {
        console.warn("[ConnectLegacySheet] Gagal memperbarui metadata:", metaErr.message)
      }
    }

    return Response.json({
      success: true,
      spreadsheetId,
      spreadsheetName,
      spreadsheetUrl,
      addedTabs: schemaResult.addedTabs,
    })
  } catch (err) {
    console.error("[ConnectLegacySheet]", err)
    return Response.json({ error: "Gagal menghubungkan spreadsheet" }, { status: 500 })
  }
}
