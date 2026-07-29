export async function getSheetData(accessToken, range, spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error("spreadsheetId is required")
  }
  const sid = spreadsheetId
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(range)}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }

  const data = await res.json()
  return data.values || []
}

export async function batchGetSheetData(accessToken, ranges, spreadsheetId) {
  if (!spreadsheetId) throw new Error("spreadsheetId is required")
  const query = ranges.map(range => `ranges=${encodeURIComponent(range)}`).join("&")
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${query}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
  return (await res.json()).valueRanges || []
}

export async function updateSheetValues(accessToken, range, values, spreadsheetId, valueInputOption = "USER_ENTERED") {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
  return res.json()
}

export async function batchUpdateSheetValues(accessToken, spreadsheetId, data, valueInputOption = "USER_ENTERED") {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ valueInputOption, data }),
  })
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
  return res.json()
}

export async function appendSheetValues(accessToken, range, values, spreadsheetId, valueInputOption = "RAW") {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=${valueInputOption}&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) throw new Error(`Sheets API error: ${await res.text()}`)
  return res.json()
}

export function parseRupiah(value) {
  if (!value) return 0
  const cleaned = String(value).replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".")
  return parseFloat(cleaned) || 0
}

export function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
