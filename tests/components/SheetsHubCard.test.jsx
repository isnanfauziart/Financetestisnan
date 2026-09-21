import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"

vi.mock("@/lib/financialWriteState", async (importOriginal) => ({
  ...(await importOriginal()),
  useFinancialWriteState: vi.fn(),
}))

import SheetsHubCard from "@/components/SheetsHubCard"
import { useFinancialWriteState } from "@/lib/financialWriteState"

const HEALTHY = { reason: null, detail: "", lastSyncedAt: "2026-09-19T08:00:00.000Z" }
const STALE = { reason: "stale", detail: "refresh failed", lastSyncedAt: "2026-09-19T08:00:00.000Z" }
const STALE_AUTH = { reason: "stale", detail: "Sesi Google berakhir. Masuk ulang ke Artami untuk memperbarui izin.", lastSyncedAt: "2026-09-19T08:00:00.000Z" }
const SCHEMA = {
  reason: "schema_conflict",
  detail: "Struktur Google Sheets perlu ditinjau agar data baru dapat disimpan.",
  lastSyncedAt: "2026-09-19T08:00:00.000Z",
}

function mockConnection(overrides = {}) {
  return {
    connected: true,
    needsLegacyReconnect: false,
    name: "Catatan Keuangan Budi",
    url: "https://docs.google.com/spreadsheets/d/sheet-1/edit",
    ...overrides,
  }
}

afterEach(() => cleanup())

describe("SheetsHubCard", () => {
  beforeEach(() => {
    useFinancialWriteState.mockReturnValue(HEALTHY)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConnection()),
    })
  })

  it("shows the connected file name and a safe open link", async () => {
    render(<SheetsHubCard lastSyncAt="2026-09-19T08:00:00.000Z" />)

    expect(await screen.findByText("Catatan Keuangan Budi")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /Buka di Google Sheets/ })
    expect(link).toHaveAttribute("href", "https://docs.google.com/spreadsheets/d/sheet-1/edit")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("shows the last successful sync and never repeats hero numbers", () => {
    render(<SheetsHubCard lastSyncAt="2026-09-19T08:00:00.000Z" />)

    expect(screen.getByText(/Terakhir tersinkron/)).toBeInTheDocument()
  })

  it("does not offer recovery actions on a healthy connection", () => {
    render(<SheetsHubCard lastSyncAt="2026-09-19T08:00:00.000Z" />)

    expect(screen.queryByRole("button", { name: /Coba lagi/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })

  it("explains that signing out or deleting the account never deletes the Sheet", () => {
    render(<SheetsHubCard lastSyncAt="2026-09-19T08:00:00.000Z" />)

    expect(screen.getByText(/tidak akan menghapus spreadsheet-mu/)).toBeInTheDocument()
  })

  it("offers a refresh action while a refresh fails", () => {
    useFinancialWriteState.mockReturnValue(STALE)
    render(<SheetsHubCard lastSyncAt="2026-09-19T08:00:00.000Z" onRefresh={vi.fn()} />)

    expect(screen.getByRole("button", { name: /Coba lagi/ })).toBeInTheDocument()
  })

  it("shows specific recovery copy for an expired Google session", () => {
    useFinancialWriteState.mockReturnValue(STALE_AUTH)
    render(<SheetsHubCard lastSyncAt="2026-09-19T08:00:00.000Z" />)

    expect(screen.getByText("Sesi Google berakhir.")).toBeInTheDocument()
    expect(screen.getByText(/masuk kembali dengan akun Google yang sama/)).toBeInTheDocument()
  })

  it("shows schema-conflict recovery copy", () => {
    useFinancialWriteState.mockReturnValue(SCHEMA)
    render(<SheetsHubCard lastSyncAt="2026-09-19T08:00:00.000Z" />)

    expect(screen.getByText("Struktur spreadsheet perlu ditinjau.")).toBeInTheDocument()
    expect(screen.getByText(/Jangan hapus atau tukar kolom apa pun/)).toBeInTheDocument()
  })

  it("guides the legacy reconnect instead of claiming a connection", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConnection({ connected: false, needsLegacyReconnect: true, name: null, url: null })),
    })
    render(<SheetsHubCard lastSyncAt={null} />)

    expect(await screen.findByText("Belum ada spreadsheet terhubung")).toBeInTheDocument()
    expect(screen.getByText(/Hubungkan spreadsheet lama milikmu/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /Buka di Google Sheets/ })).not.toBeInTheDocument()
  })
})
