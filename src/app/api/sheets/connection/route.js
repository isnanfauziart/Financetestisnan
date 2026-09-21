import { getAuthContext } from "@/lib/apiAuth"
import { fetchSpreadsheetFileInfo } from "@/lib/sheetManager"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

/**
 * Wave 2: connection metadata for the Google Sheets Anda card. Returns only
 * the signed-in user's own connection info; every read and lazy backfill is
 * scoped to that user's row.
 */
export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const spreadsheetId = String(auth.user?.spreadsheet_id || "").trim()
  const connected = Boolean(spreadsheetId)
  const needsLegacyReconnect = Boolean(auth.needsSheetConnection)

  let name = connected ? auth.user?.spreadsheet_name || null : null
  let url = connected
    ? auth.user?.spreadsheet_url
      || `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`
    : null

  if (connected && !name) {
    // Lazy backfill for connections created before metadata existed. Failure is
    // non-fatal: the card still works and the next attempt retries.
    try {
      const info = await fetchSpreadsheetFileInfo(auth.accessToken, spreadsheetId)
      if (info.name || info.url) {
        name = info.name || name
        url = info.url || url
        const { error: updateErr } = await supabaseAdmin
          .from("users")
          .update({
            spreadsheet_name: info.name || null,
            spreadsheet_url: info.url || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", auth.user.id)
          .eq("spreadsheet_id", spreadsheetId)
        if (updateErr) {
          console.warn("[SheetsConnection] Gagal menyimpan metadata:", updateErr.message)
        }
      }
    } catch (err) {
      console.warn("[SheetsConnection] Gagal membaca info spreadsheet:", err.message)
    }
  }

  return Response.json({
    connected,
    needsLegacyReconnect,
    name,
    url,
  })
}
