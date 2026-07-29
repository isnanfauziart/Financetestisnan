import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import QuickAddSheet from "@/app/dashboard/_components/QuickAddSheet"

describe("transaction quota forms", () => {
  it("keeps Quick Add input and shows Upgrade when the API limit is reached", async () => {
    const onSubmit = vi.fn(async () => ({
      ok: false,
      error: {
        error: "Batas transaksi paket Free sudah tercapai.",
        code: "FEATURE_LIMIT_REACHED",
      },
    }))
    render(
      <QuickAddSheet
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        onGoalContribute={vi.fn()}
        transactionUsage={{ current: 75, limit: 75, warning: "reached" }}
      />
    )

    const amount = screen.getByLabelText("Jumlah transaksi")
    fireEvent.change(amount, { target: { value: "125000" } })
    fireEvent.click(screen.getByLabelText("Simpan transaksi"))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(amount).toHaveValue("125.000")
    expect(screen.getByRole("link", { name: "Upgrade ke Pro" })).toHaveAttribute("href", "/upgrade")
  })
})
