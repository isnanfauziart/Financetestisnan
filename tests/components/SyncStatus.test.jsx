import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import SyncStatus from "@/app/dashboard/_components/SyncStatus"
import { markStale, markSchemaConflict, resetWriteState } from "@/lib/financialWriteState"

afterEach(() => {
  cleanup()
  resetWriteState()
})

const HEALTHY_WRITE_STATE = { reason: null, detail: "", lastSyncedAt: "2026-08-09T09:58:00.000Z" }
const STALE_WRITE_STATE = { reason: "stale", detail: "refresh failed", lastSyncedAt: "2026-08-09T09:58:00.000Z" }
const UNRESOLVED_WRITE_STATE = { reason: "unresolved", detail: "op-1", lastSyncedAt: "2026-08-09T09:58:00.000Z" }
const SCHEMA_WRITE_STATE = {
  reason: "schema_conflict",
  detail: "Struktur Google Sheets perlu ditinjau agar data baru dapat disimpan.",
  lastSyncedAt: "2026-08-09T09:58:00.000Z",
}
const PENDING_WRITE_STATE = { reason: "pending", detail: "cached", lastSyncedAt: "2026-08-09T09:58:00.000Z" }

function createProps(overrides = {}) {
  return {
    lastSyncAt: "2026-08-09T09:58:00.000Z",
    refreshing: false,
    isOnline: true,
    onRefresh: vi.fn(),
    getLastSyncAgo: vi.fn(() => "2 menit lalu"),
    now: 1_000,
    haptics: { tap: vi.fn() },
    hapticsEnabled: true,
    writeState: HEALTHY_WRITE_STATE,
    ...overrides,
  }
}

describe("SyncStatus", () => {
  it("shows the current Google Sheets sync state and keeps the refresh control at 44px", () => {
    const props = createProps()
    render(<SyncStatus {...props} />)

    const refreshButton = screen.getByRole("button", { name: "Perbarui data" })
    expect(refreshButton).toHaveTextContent("Tersinkron ke Google Sheets - 2 menit lalu")
    expect(refreshButton).toHaveClass("min-h-11")
    expect(props.getLastSyncAgo).toHaveBeenCalledWith(props.lastSyncAt, props.now)
  })

  it("refreshes and gives haptic feedback when the row is pressed", () => {
    const props = createProps()
    render(<SyncStatus {...props} />)

    fireEvent.click(screen.getByRole("button", { name: "Perbarui data" }))

    expect(props.onRefresh).toHaveBeenCalledTimes(1)
    expect(props.haptics.tap).toHaveBeenCalledTimes(1)
  })

  it("shows the refreshing state", () => {
    render(<SyncStatus {...createProps({ refreshing: true })} />)

    const refreshButton = screen.getByRole("button", { name: "Perbarui data" })
    expect(refreshButton).toHaveTextContent("Menyinkronkan...")
    expect(refreshButton).toBeDisabled()
  })

  it("labels a background auto-refresh as checking instead of syncing", () => {
    render(<SyncStatus {...createProps({ refreshing: true, checkingRefresh: true })} />)

    expect(screen.getByRole("button", { name: "Perbarui data" })).toHaveTextContent("Memeriksa pembaruan…")
  })

  it("keeps an unsynced account neutral and refreshable", () => {
    const props = createProps({ lastSyncAt: null })
    render(<SyncStatus {...props} />)

    const refreshButton = screen.getByRole("button", { name: "Perbarui data" })
    expect(refreshButton).toHaveTextContent("Belum tersinkron")
    expect(refreshButton).not.toHaveTextContent("Tersinkron ke Google Sheets")
    expect(refreshButton).not.toBeDisabled()
    expect(refreshButton.querySelector("svg")).not.toBeNull()

    fireEvent.click(refreshButton)

    expect(props.onRefresh).toHaveBeenCalledTimes(1)
  })

  it("shows the offline state without claiming a fresh sync", () => {
    render(<SyncStatus {...createProps({ isOnline: false })} />)

    const button = screen.getByRole("button", { name: "Perbarui data" })
    expect(button).toHaveTextContent("Anda sedang offline")
    expect(button).toHaveTextContent("Menampilkan data terakhir yang tersimpan di perangkat ini")
    expect(button).not.toHaveTextContent("Tersinkron ke Google Sheets")
  })

  it("never claims synced after a failed refresh and names the failure", () => {
    render(<SyncStatus {...createProps({ writeState: STALE_WRITE_STATE })} />)

    const button = screen.getByRole("button", { name: "Coba lagi" })
    expect(button).toHaveTextContent("Pembaruan data gagal")
    expect(button).toHaveTextContent("Menampilkan data terakhir yang berhasil disinkronkan 2 menit lalu")
    expect(button).not.toHaveTextContent("Tersinkron ke Google Sheets")
  })

  it("still shows the failure label while checking for updates in the background", () => {
    render(<SyncStatus {...createProps({ writeState: STALE_WRITE_STATE, refreshing: true, checkingRefresh: true })} />)

    const button = screen.getByRole("button", { name: "Coba lagi" })
    expect(button).toHaveTextContent("Memeriksa pembaruan…")
    expect(button).not.toHaveTextContent("Tersinkron ke Google Sheets")
  })

  it("keeps the failure label while a background check runs and returns to synced on success", () => {
    render(<SyncStatus {...createProps({ writeState: STALE_WRITE_STATE, refreshing: true, checkingRefresh: true })} />)
    expect(screen.getByRole("button", { name: "Coba lagi" })).toHaveTextContent("Memeriksa pembaruan…")

    cleanup()
    render(<SyncStatus {...createProps()} />)
    expect(screen.getByRole("button", { name: "Perbarui data" })).toHaveTextContent("Tersinkron ke Google Sheets - 2 menit lalu")
  })

  it("treats an unresolved operation as a failed refresh, not a sync", () => {
    render(<SyncStatus {...createProps({ writeState: UNRESOLVED_WRITE_STATE })} />)

    const button = screen.getByRole("button", { name: "Coba lagi" })
    expect(button).toHaveTextContent("Pembaruan data gagal")
    expect(button).not.toHaveTextContent("Tersinkron ke Google Sheets")
  })

  it("shows the schema-conflict message from the shared store", () => {
    render(<SyncStatus {...createProps({ writeState: SCHEMA_WRITE_STATE })} />)

    const button = screen.getByRole("button", { name: "Perbarui data" })
    expect(button).toHaveTextContent("Struktur Google Sheets perlu ditinjau")
    expect(button).not.toHaveTextContent("Tersinkron ke Google Sheets")
  })

  it("shows the pending login-freshness label instead of claiming synced", () => {
    render(<SyncStatus {...createProps({ writeState: PENDING_WRITE_STATE })} />)

    const button = screen.getByRole("button", { name: "Perbarui data" })
    expect(button).toHaveTextContent("Memuat data terbaru…")
    expect(button).not.toHaveTextContent("Tersinkron ke Google Sheets")
    expect(button).not.toBeDisabled()
  })

  it("removes the separate synchronization info affordance", () => {
    render(<SyncStatus {...createProps()} />)

    expect(screen.queryByRole("button", { name: "Info sinkronisasi" })).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog", { name: "Tentang sinkronisasi" })).not.toBeInTheDocument()
  })
})
