import { getAuthContext } from "@/lib/apiAuth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getSheetData } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

async function fetchSettings(userId) {
  const { data, error } = await supabaseAdmin
    .from("user_settings")
    .select("key, value")
    .eq("user_id", userId)

  if (error) {
    console.error("[Settings] Supabase error:", error.message)
    return { startingBalance: 0, startingBalanceDate: "" }
  }

  const settings = { startingBalance: 0, startingBalanceDate: "" }
  for (const row of data || []) {
    const key = String(row.key || "").trim().toLowerCase()
    if (key === "startingbalance") {
      settings.startingBalance = parseFloat(row.value) || 0
    } else if (key === "startingbalancedate") {
      settings.startingBalanceDate = String(row.value || "").trim()
    }
  }
  return settings
}

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await fetchSettings(auth.user.id)
    return Response.json({ settings })
  } catch (err) {
    console.error("[Settings]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function PUT(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { accessToken, spreadsheetId, user } = auth

  try {
    const body = await request.json()
    const { updates } = body

    const entries = updates || (body.key ? [[body.key, body.value]] : [])
    if (entries.length === 0) {
      return Response.json({ error: "No updates provided" }, { status: 400 })
    }

    // 1. Write to Supabase (primary)
    for (const [key, value] of entries) {
      if (!key) continue

      const { error } = await supabaseAdmin
        .from("user_settings")
        .upsert({
          user_id: user.id,
          key,
          value: String(value || ""),
        }, { onConflict: "user_id,key" })

      if (error) {
        console.error("[Settings] Supabase write error:", error.message)
      }
    }

    // 2. Write to Google Sheets (backup/sync) - non-blocking
    try {
      const RANGE = "Settings!A:B"
      const rows = await getSheetData(accessToken, RANGE, spreadsheetId).catch(() => [])
      const existingKeys = {}
      for (let i = 0; i < rows.length; i++) {
        const key = String(rows[i]?.[0] || "").trim()
        if (key) existingKeys[key.toLowerCase()] = i + 1
      }

      for (const [key, value] of entries) {
        if (!key) continue
        const targetRow = existingKeys[key.toLowerCase()]

        if (targetRow) {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`Settings!A${targetRow}:B${targetRow}`)}?valueInputOption=USER_ENTERED`
          await fetch(url, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ values: [[key, value]] }),
          })
        } else {
          const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
          await fetch(appendUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ values: [[key, value]] }),
          })
        }
      }
    } catch (sheetErr) {
      console.error("[Settings] Google Sheets write failed (non-critical):", sheetErr.message)
    }

    return Response.json({ success: true, message: "Settings updated" })
  } catch (err) {
    console.error("[Settings]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
