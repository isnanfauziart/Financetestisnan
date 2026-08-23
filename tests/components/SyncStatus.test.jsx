import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import SyncStatus from "@/app/dashboard/_components/SyncStatus"

afterEach(() => cleanup())

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

  it("shows the offline state with the last successful sync time", () => {
    render(<SyncStatus {...createProps({ isOnline: false })} />)

    expect(screen.getByRole("button", { name: "Perbarui data" })).toHaveTextContent(
      "Offline - terakhir tersinkron 2 menit lalu",
    )
  })

  it("removes the separate synchronization info affordance", () => {
    render(<SyncStatus {...createProps()} />)

    expect(screen.queryByRole("button", { name: "Info sinkronisasi" })).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog", { name: "Tentang sinkronisasi" })).not.toBeInTheDocument()
  })
})
