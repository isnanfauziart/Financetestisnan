import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import {
  CATEGORIES_KEY,
  getLegacyCategories,
  normalizeCategories,
  parseStoredCategories,
} from "@/lib/categories"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Settings"
const RANGE = `${SHEET_NAME}!A:B`

async function fetchSettings(accessToken, spreadsheetId) {
  let rows = []
  try {
    rows = await getSheetData(accessToken, RANGE, spreadsheetId) || []
  } catch {
    rows = []
  }
  const settings = {
    startingBalance: 0,
    startingBalanceDate: "",
    userName: "",
    userNamePromptDismissed: false,
    categories: getLegacyCategories(),
  }
  for (let i = 0; i < rows.length; i++) {
    const key = String(rows[i]?.[0] || "").trim().toLowerCase()
    const val = rows[i]?.[1]
    if (key === "startingbalance") {
      settings.startingBalance = parseRupiah(val || 0)
    } else if (key === "startingbalancedate") {
      settings.startingBalanceDate = String(val || "").trim()
    } else if (key === "username") {
      settings.userName = String(val ?? "").trim()
    } else if (key === "usernamepromptdismissed") {
      settings.userNamePromptDismissed = val === "true"
    } else if (key === CATEGORIES_KEY.toLowerCase()) {
      settings.categories = parseStoredCategories(val) || getLegacyCategories()
    }
  }
  return settings
}

const SETTING_KEYS = {
  startingbalance: "startingBalance",
  startingbalancedate: "startingBalanceDate",
  username: "userName",
  usernamepromptdismissed: "userNamePromptDismissed",
}

function canonicalSettingKey(value) {
  if (typeof value !== "string") return null
  return SETTING_KEYS[value.trim().toLowerCase()] || null
}

function collectUpdates(body) {
  const entries = []
  if (body.updates !== undefined) {
    if (!Array.isArray(body.updates)) throw new Error("Invalid updates")
    for (const entry of body.updates) {
      if (!Array.isArray(entry) || entry.length < 2) throw new Error("Invalid update")
      const key = canonicalSettingKey(entry[0])
      if (!key) throw new Error("Invalid setting key")
      entries.push([key, entry[1]])
    }
  }

  if (body.key !== undefined) {
    const key = canonicalSettingKey(body.key)
    if (!key) throw new Error("Invalid setting key")
    entries.push([key, body.value])
  }

  if (Object.prototype.hasOwnProperty.call(body, "categories")) {
    const categories = normalizeCategories(body.categories)
    if (!categories) throw new Error("Invalid categories")
    entries.push([CATEGORIES_KEY, JSON.stringify(categories)])
  }

  if (entries.length === 0) throw new Error("No updates provided")
  return entries
}

function serializeSettingValue(key, value) {
  if (key === "startingBalance") {
    if (value === null || (typeof value !== "string" && typeof value !== "number")) throw new Error("Invalid starting balance")
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) throw new Error("Invalid starting balance")
    return String(value)
  }
  if (key === "startingBalanceDate") {
    if (value === null || typeof value !== "string") throw new Error("Invalid starting balance date")
    const date = value.trim()
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid starting balance date")
    return date
  }
  if (key === "userName") {
    if (typeof value !== "string") throw new Error("Invalid user name")
    const name = value.trim()
    if (Array.from(name).length > 60) throw new Error("Invalid user name")
    return name
  }
  if (key === "userNamePromptDismissed") {
    if (typeof value !== "boolean") throw new Error("Invalid user name prompt dismissal")
    return value ? "true" : "false"
  }
  return String(value ?? "")
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
    let entries
    try {
      entries = collectUpdates(body || {})
      entries = entries.map(([key, value]) => [key, serializeSettingValue(key, value)])
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    let rows = []
    try {
      rows = await getSheetData(accessToken, RANGE, spreadsheetId) || []
    } catch {
      rows = []
    }
    const existingKeys = {}
    for (let i = 0; i < rows.length; i++) {
      const key = String(rows[i]?.[0] || "").trim()
      if (key) existingKeys[key.toLowerCase()] = i + 1
    }

    for (const [key, value] of entries) {
      const targetRow = existingKeys[key.toLowerCase()]

      if (targetRow) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAME}!A${targetRow}:B${targetRow}`)}?valueInputOption=RAW`
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
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(RANGE)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
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
        existingKeys[key.toLowerCase()] = (rows.length + 1)
      }
    }

    return Response.json({ success: true, message: "Settings updated" })
  } catch (err) {
    console.error("[Settings]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
