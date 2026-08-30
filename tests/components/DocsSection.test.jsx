import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

async function renderDocsSection() {
  const { default: DocsSection } = await import("@/components/DocsSection")
  return render(<DocsSection />)
}

describe("DocsSection", () => {
  it("opens the hub from the profile trigger and shows all groups and topics", async () => {
    await renderDocsSection()

    fireEvent.click(screen.getByRole("button", { name: "Buka Panduan Artami" }))

    expect(screen.getByText("Istilah")).toBeInTheDocument()
    expect(screen.getByText("Cara kerja fitur")).toBeInTheDocument()
    expect(screen.getByText("Data & privasi")).toBeInTheDocument()
    expect(screen.getByText("Free & Pro")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Pengeluaran Rutin & Spesial" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buka Financial Independence" })).toBeInTheDocument()
  })

  it("shows topic detail with body content and Pro badge, and returns to the hub", async () => {
    await renderDocsSection()

    fireEvent.click(screen.getByRole("button", { name: "Buka Panduan Artami" }))
    fireEvent.click(screen.getByRole("button", { name: "Buka Pengeluaran Rutin & Spesial" }))

    expect(screen.getByText(/setiap pengeluaran bisa ditandai sebagai rutin atau spesial/i)).toBeInTheDocument()
    expect(screen.getByText(/spesial tetap dihitung penuh di saldo/i)).toBeInTheDocument()
    expect(screen.getByText("Contoh")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Kembali ke daftar panduan" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Kembali ke daftar panduan" }))

    expect(screen.getByText("Istilah")).toBeInTheDocument()
    expect(screen.queryByText(/spesial tetap dihitung penuh di saldo/i)).not.toBeInTheDocument()
  })

  it("shows the Pro badge for Pro-only topics in the hub", async () => {
    await renderDocsSection()

    fireEvent.click(screen.getByRole("button", { name: "Buka Panduan Artami" }))

    const fiButton = screen.getByRole("button", { name: "Buka Financial Independence" })
    expect(fiButton.textContent).toContain("Pro")

    const undoButton = screen.getByRole("button", { name: "Buka Undo (Batalkan Transaksi)" })
    expect(undoButton.textContent).not.toContain("Pro")
  })
})
