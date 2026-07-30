export const SHEET_CONNECTION_REQUIRED_CODE = "SHEET_CONNECTION_REQUIRED"
export const SHEET_RECONNECT_REQUIRED_CODE = "SHEET_RECONNECT_REQUIRED"

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

export function getLegacySheetOwnerEmail() {
  return normalizeEmail(process.env.LEGACY_SHEET_OWNER_EMAIL)
}

export function isLegacySheetOwner(email) {
  const ownerEmail = getLegacySheetOwnerEmail()
  return !!ownerEmail && normalizeEmail(email) === ownerEmail
}

export function needsLegacySheetConnection(user) {
  return isLegacySheetOwner(user?.email) && !user?.spreadsheet_id
}

export function isValidSpreadsheetId(spreadsheetId) {
  return /^[A-Za-z0-9_-]{8,128}$/.test(String(spreadsheetId || ""))
}

export function isSheetNotFoundError(error) {
  const message = String(error?.message || error || "")
  return message.includes("Sheets API error")
    && (message.includes('"code": 404') || message.includes('"code":404'))
    && message.includes("NOT_FOUND")
}

export function sheetConnectionRequiredPayload() {
  return {
    error: "Hubungkan spreadsheet Artami terlebih dahulu",
    code: SHEET_CONNECTION_REQUIRED_CODE,
    needsSheetConnection: true,
  }
}

export function sheetReconnectRequiredPayload() {
  return {
    error: "Pilih kembali spreadsheet Artami agar perangkat ini mendapat akses.",
    code: SHEET_RECONNECT_REQUIRED_CODE,
    needsSheetConnection: true,
  }
}
