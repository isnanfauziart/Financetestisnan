import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Settings"
const RANGE = `${SHEET_NAME}!A:B`

async function fetchSettings(accessToken, spreadsheetId) {
  const rows = await getSheetData(accessToken, RANGE, spreadsheetId).catch(() => [])
  const settings = { startingBalance: 0, startingBalanceDate: "" }
  for (let i = 0; i < rows.length; i++) {
    const key = String(rows[i]?.[0] || "").trim().toLowerCase()
    const val = rows[i]?.[1]
    if (key === "startingbalance") {
      settings.startingBalance = parseRupiah(val || 0)
    } else if (key === "startingbalancedate") {
      settings.startingBalanceDate = String(val || "").trim()
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
    const settings = await fetchSettings(auth.accessToken, auth.spreadsheetId)
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
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    const { updates } = body

    const entries = updates || (body.key ? [[body.key, body.value]] : [])
    if (entries.length === 0) {
      return Response.json({ error: "No updates provided" }, { status: 400 })
    }

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
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAME}!A${targetRow}:B${targetRow}`)}?valueInputOption=USER_ENTERED`
        const res = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [[key, value]] }),
        })
        if (!res.ok) {
          const err = await res.text()
          throw new Error(`Sheets API error: ${err}`)
        }
      } else {
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
        const res = await fetch(appendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [[key, value]] }),
        })
        if (!res.ok) {
          const err = await res.text()
          throw new Error(`Sheets API error: ${err}`)
        }
        existingKeys[key] = (rows.length + 1)
      }
    }

    return Response.json({ success: true, message: "Settings updated" })
  } catch (err) {
    console.error("[Settings]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
