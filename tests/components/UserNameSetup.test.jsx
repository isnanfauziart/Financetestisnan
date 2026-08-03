import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import UserNameSetup from "@/components/UserNameSetup"

function response(body, ok = true) {
  return { ok, json: async () => body }
}

function renderSetup(overrides = {}) {
  return render(
    <UserNameSetup
      initialValue=""
      open={true}
      mode="prompt"
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onDismissed={vi.fn()}
      {...overrides}
    />,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("UserNameSetup", () => {
  it("renders an accessible name input with the 60-character limit", () => {
    renderSetup({ mode: "settings" })

    const input = screen.getByLabelText("Nama pengguna")

    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute("maxLength", "60")
    expect(screen.queryByRole("button", { name: "Nanti" })).not.toBeInTheDocument()
  })

  it("prefills from initialValue when the sheet opens", () => {
    const props = {
      initialValue: "Ayu Lestari",
      open: false,
      mode: "prompt",
      onClose: vi.fn(),
      onSaved: vi.fn(),
      onDismissed: vi.fn(),
    }
    const { rerender } = render(<UserNameSetup {...props} />)

    expect(screen.queryByLabelText("Nama pengguna")).not.toBeInTheDocument()

    rerender(<UserNameSetup {...props} open={true} />)

    expect(screen.getByLabelText("Nama pengguna")).toHaveValue("Ayu Lestari")
  })

  it("saves a trimmed name and dismisses the prompt", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(response({ success: true }))
    const onSaved = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    renderSetup({ initialValue: "Google Name", onSaved })
    fireEvent.change(screen.getByLabelText("Nama pengguna"), { target: { value: "  Nama Baru  " } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    expect(fetchSpy).toHaveBeenCalledWith("/api/settings", expect.objectContaining({ method: "PUT" }))
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      updates: [
        ["userName", "Nama Baru"],
        ["userNamePromptDismissed", true],
      ],
    })
    expect(onSaved).toHaveBeenCalledWith("Nama Baru")
  })

  it("clears the saved name and re-enables the prompt", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(response({ success: true }))
    vi.stubGlobal("fetch", fetchSpy)

    renderSetup({ initialValue: "Nama Lama", mode: "settings" })
    fireEvent.change(screen.getByLabelText("Nama pengguna"), { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      updates: [
        ["userName", ""],
        ["userNamePromptDismissed", false],
      ],
    })
  })

  it("persists prompt dismissal with Nanti", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(response({ success: true }))
    const onDismissed = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    renderSetup({ onDismissed })
    fireEvent.click(screen.getByRole("button", { name: "Nanti" }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      updates: [["userNamePromptDismissed", true]],
    })
    expect(onDismissed).toHaveBeenCalled()
  })

  it("keeps typed input and shows the API error when saving fails", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(response({ error: "Gagal menyimpan nama" }, false))
    const onSaved = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    renderSetup({ onSaved })
    const input = screen.getByLabelText("Nama pengguna")
    fireEvent.change(input, { target: { value: "Nama yang diketik" } })
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal menyimpan nama")
    expect(input).toHaveValue("Nama yang diketik")
    expect(onSaved).not.toHaveBeenCalled()
  })
})
