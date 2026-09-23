import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import BalanceDetailSheet from "@/components/BalanceDetailSheet"
import { buildRincianRows, BALANCE_COPY } from "@/app/dashboard/_components/balanceCopy"

afterEach(cleanup)

const base = {
  netWorth: 8000000,
  recordedBalance: 9000000,
  available: { value: 4000000, shortfall: 250000 },
  outstanding: { utang: 1000000, piutang: 0, utangCount: 1, piutangCount: 0 },
  rincian: {
    recordedBalance: 9000000,
    goalReservations: 1500000,
    unassignedSavings: 500000,
    unassignedSavingsCount: 2,
    investmentReserved: 0,
    needsReviewCount: 0,
    needsReviewTotal: 0,
    estimate: false,
    available: 4000000,
    shortfall: 250000,
    unpaidBills: { count: 1, total: 300000 },
  },
}

describe("BalanceDetailSheet (Wave 6)", () => {
  it("renders the canonical split rows with unpaid bills informational and the guard alert", () => {
    render(
      <BalanceDetailSheet
        open
        onClose={vi.fn()}
        rows={buildRincianRows(base)}
        estimate={base.rincian.estimate}
        guardBlocked={Boolean(base.available.shortfall)}
        guardMessage="Alokasi tabungan dan target melebihi saldo yang direkam."
      />
    )

    const rincian = screen.getByRole("dialog", { name: "Rincian saldo" })
    expect(rincian).toHaveTextContent("Uang kamu")
    expect(rincian).toHaveTextContent("Saldo Tercatat")
    expect(rincian).toHaveTextContent("Dialokasikan ke target")
    expect(rincian).toHaveTextContent("Tabungan tanpa target")
    expect(rincian).toHaveTextContent("Utang belum lunas")
    expect(rincian).toHaveTextContent("Tagihan belum dibayar")
    expect(rincian).toHaveTextContent("Tidak mengurangi dana yang bisa dipakai sampai benar-benar dibayar.")
    expect(rincian).toHaveTextContent("Bisa dipakai sekarang")
    expect(rincian).not.toHaveTextContent("Kekayaan Bersih")
    expect(rincian).not.toHaveTextContent("Dana yang bisa dipakai saat ini")

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Alokasi tabungan dan target melebihi saldo yang direkam.")

    fireEvent.click(screen.getByRole("button", { name: "Close" }))
  })

  it("shows the conservative estimate note when the recorded balance is an estimate", () => {
    const balances = {
      ...base,
      rincian: { ...base.rincian, estimate: true, shortfall: 0 },
      available: { value: 4000000, shortfall: 0 },
    }

    render(
      <BalanceDetailSheet
        open
        onClose={vi.fn()}
        rows={buildRincianRows(balances)}
        estimate
        guardBlocked={false}
        guardMessage={null}
      />
    )

    const rincian = screen.getByRole("dialog", { name: "Rincian saldo" })
    expect(rincian).toHaveTextContent(BALANCE_COPY.estimateNote)
    expect(screen.queryByRole("alert")).toBeNull()
  })
})
