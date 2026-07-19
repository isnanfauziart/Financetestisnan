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
