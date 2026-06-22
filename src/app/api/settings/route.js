import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Settings"
const RANGE = `${SHEET_NAME}!A:B`

async function fetchSettings(accessToken) {
  const rows = await getSheetData(accessToken, RANGE).catch(() => [])
  const settings = { startingBalance: 0 }
  for (let i = 0; i < rows.length; i++) {
    const key = String(rows[i]?.[0] || "").trim()
    const val = rows[i]?.[1]
    if (key === "startingBalance") {
      settings.startingBalance = parseRupiah(val || 0)
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
    const { key, value } = body

    if (!key) {
      return Response.json({ error: "key required" }, { status: 400 })
    }

    // Read existing rows to find the key
    const rows = await getSheetData(session.accessToken, RANGE).catch(() => [])
    let targetRow = -1
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i]?.[0] || "").trim() === key) {
        targetRow = i + 1 // 1-indexed for Sheets API
        break
      }
    }

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
      // If row doesn't exist, append it
      if (targetRow === -1) {
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
        const appendRes = await fetch(appendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [[key, value]] }),
        })
        if (!appendRes.ok) {
          const err = await appendRes.text()
          throw new Error(`Sheets API error: ${err}`)
        }
      } else {
        const err = await res.text()
        throw new Error(`Sheets API error: ${err}`)
      }
    }

    return Response.json({ success: true, message: `Setting '${key}' updated` })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
