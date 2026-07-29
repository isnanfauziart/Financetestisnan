import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import TransactionQuotaStatus from "@/components/TransactionQuotaStatus"

describe("TransactionQuotaStatus", () => {
  it("shows the 80% warning and an accessible upgrade CTA at the limit", () => {
    const { rerender } = render(
      <TransactionQuotaStatus usage={{ current: 60, limit: 75, warning: "near" }} />
    )
    expect(screen.getByRole("status")).toHaveTextContent("60 dari 75 transaksi")

    rerender(
      <TransactionQuotaStatus
        usage={{ current: 75, limit: 75, warning: "reached" }}
      />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Batas 75 transaksi")
    expect(screen.getByRole("link", { name: "Upgrade ke Pro" })).toHaveAttribute("href", "/upgrade")
  })
})
