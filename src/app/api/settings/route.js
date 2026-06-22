import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Settings"
const RANGE = `${SHEET_NAME}!A:B`

async function fetchSettings(accessToken) {
  const rows = await getSheetData(accessToken, RANGE).catch(() => [])
  const settings = { startingBalance: 0, startingBalanceDate: "" }
  for (let i = 0; i < rows.length; i++) {
    const key = String(rows[i]?.[0] || "").trim()
    const val = rows[i]?.[1]
    if (key === "startingBalance") {
      settings.startingBalance = parseRupiah(val || 0)
    } else if (key === "startingBalanceDate") {
      settings.startingBalanceDate = String(val || "").trim()
    }
  }
  return settings
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await fetchSettings(session.accessToken)
    return Response.json({ settings })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { updates } = body

    // Support both single key-value and batch updates
    const entries = updates || (body.key ? [[body.key, body.value]] : [])
    if (entries.length === 0) {
      return Response.json({ error: "No updates provided" }, { status: 400 })
    }

    // Read existing rows
    const rows = await getSheetData(session.accessToken, RANGE).catch(() => [])
    const existingKeys = {}
    for (let i = 0; i < rows.length; i++) {
      const key = String(rows[i]?.[0] || "").trim()
      if (key) existingKeys[key] = i + 1 // 1-indexed row
    }

    for (const [key, value] of entries) {
      if (!key) continue
      const targetRow = existingKeys[key]

      if (targetRow) {
        // Update existing row
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(`${SHEET_NAME}!A${targetRow}:B${targetRow}`)}?valueInputOption=USER_ENTERED`
        const res = await fetch(url, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [[key, value]] }),
        })
        if (!res.ok) {
          const err = await res.text()
          throw new Error(`Sheets API error: ${err}`)
        }
      } else {
        // Append new row
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
        const res = await fetch(appendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [[key, value]] }),
        })
        if (!res.ok) {
          const err = await res.text()
          throw new Error(`Sheets API error: ${err}`)
        }
        // Track newly appended key
        existingKeys[key] = (rows.length + 1)
      }
    }

    return Response.json({ success: true, message: "Settings updated" })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
