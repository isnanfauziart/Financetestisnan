import { describe, expect, it, beforeEach, afterEach } from "vitest"

import {
  SHEET_CONNECTION_REQUIRED_CODE,
  isLegacySheetOwner,
  isValidSpreadsheetId,
  needsLegacySheetConnection,
} from "@/lib/legacySheet"

describe("legacySheet helpers", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.LEGACY_SHEET_OWNER_EMAIL = "Owner@Example.com"
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("matches the configured owner email case-insensitively", () => {
    expect(isLegacySheetOwner("owner@example.com")).toBe(true)
    expect(isLegacySheetOwner(" OWNER@example.com ")).toBe(true)
    expect(isLegacySheetOwner("other@example.com")).toBe(false)
  })

  it("requires the owner to connect a sheet only while spreadsheet_id is empty", () => {
    expect(needsLegacySheetConnection({ email: "owner@example.com", spreadsheet_id: null })).toBe(true)
    expect(needsLegacySheetConnection({ email: "owner@example.com", spreadsheet_id: "sheet_123" })).toBe(false)
    expect(needsLegacySheetConnection({ email: "other@example.com", spreadsheet_id: null })).toBe(false)
  })

  it("validates Google spreadsheet IDs without accepting arbitrary strings", () => {
    expect(isValidSpreadsheetId("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")).toBe(true)
    expect(isValidSpreadsheetId("abc_def-123")).toBe(true)
    expect(isValidSpreadsheetId("https://docs.google.com/spreadsheets/d/abc")).toBe(false)
    expect(isValidSpreadsheetId("../secret")).toBe(false)
    expect(isValidSpreadsheetId("")).toBe(false)
  })

  it("exports a stable API error code for the dashboard connection state", () => {
    expect(SHEET_CONNECTION_REQUIRED_CODE).toBe("SHEET_CONNECTION_REQUIRED")
  })
})
