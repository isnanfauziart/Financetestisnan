import { useState } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import WalletTab from "@/app/dashboard/WalletTab"

vi.mock("@/components/EventTagPicker", () => ({
  default: () => <div data-testid="event-tag-picker" />,
}))

vi.mock("@/lib/useSharedData", async (importOriginal) => ({
  ...(await importOriginal()),
  useSettings: vi.fn(),
}))

const { useSettings } = await import("@/lib/useSharedData")

function WalletHarness({ initialType = "expense", handleSubmit = vi.fn(), specialSuggestion } = {}) {
  const [txType, setTxType] = useState(initialType)
  const [formData, setFormData] = useState({
    tanggal: "2026-08-08",
    keterangan: "",
    kategori: "",
    jumlah: "",
    akunBank: "",
    catatan: "",
    eventId: "",
    sifat: "Rutin",
  })
  const [rawAmount, setRawAmount] = useState("")

  return (
    <WalletTab
      txType={txType}
      formData={formData}
      rawAmount={rawAmount}
      submitting={false}
      setTxType={setTxType}
      setFormData={setFormData}
      setRawAmount={setRawAmount}
      handleSubmit={handleSubmit}
      onGoalContribute={vi.fn()}
      transactionUsage={null}
      quotaError={null}
      specialSuggestion={specialSuggestion}
    />
  )
}

describe("WalletTab special expense classification", () => {
  beforeEach(() => {
    useSettings.mockReturnValue({
      settings: {
        categories: {
          expense: [{ name: "Kondangan", icon: "Gift", active: true }],
          income: [{ name: "Gaji", icon: "Coins", active: true }],
        },
      },
    })
  })

  it("submits Spesial only for an opted-in expense", () => {
    const handleSubmit = vi.fn()
    render(<WalletHarness handleSubmit={handleSubmit} />)

    fireEvent.click(screen.getByLabelText("Pengeluaran Spesial"))
    fireEvent.change(screen.getByLabelText("Jumlah transaksi"), { target: { value: "150.000" } })
    fireEvent.submit(screen.getByRole("button", { name: "Simpan transaksi" }).closest("form"))

    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({
      txType: "expense",
      formData: expect.objectContaining({ sifat: "Spesial" }),
    }))
  })

  it("hides the classification control after switching to income", () => {
    render(<WalletHarness />)

    expect(screen.getByLabelText("Pengeluaran Spesial")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Pilih form pemasukan" }))

    expect(screen.queryByLabelText("Pengeluaran Spesial")).not.toBeInTheDocument()
  })
})
