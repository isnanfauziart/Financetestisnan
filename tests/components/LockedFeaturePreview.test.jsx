import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

describe("LockedFeaturePreview", () => {
  it("provides a static, accessible upgrade path", async () => {
    const { default: LockedFeaturePreview } = await import("@/components/LockedFeaturePreview")

    render(
      <LockedFeaturePreview
        title="Health Score"
        description="Lihat ringkasan kesehatan finansial."
        href="/upgrade"
      />
    )

    expect(screen.getByText("Lihat ringkasan kesehatan finansial.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /buka pro untuk health score/i })).toHaveAttribute("href", "/upgrade")
  })

  it("uses the temporary-closure CTA when Pro registration is closed", async () => {
    const { default: LockedFeaturePreview } = await import("@/components/LockedFeaturePreview")

    render(
      <LockedFeaturePreview
        title="Health Score"
        description="Ringkasan kesehatan finansial tersedia di Pro."
        href="/upgrade"
        proRegistrationOpen={false}
      />
    )

    expect(screen.getByRole("link", { name: "Pro sementara ditutup" })).toHaveAttribute("href", "/upgrade")
  })

  it("shows exactly one upgrade action per preview", async () => {
    const { default: LockedFeaturePreview } = await import("@/components/LockedFeaturePreview")

    render(
      <LockedFeaturePreview
        title="Cash Flow Forecast"
        description="Prediksi arus kas tersedia di Pro."
        href="/upgrade"
      />
    )

    expect(screen.getAllByRole("link", { name: /buka pro/i })).toHaveLength(1)
  })

  it("renders the static non-personal example line when provided", async () => {
    const { default: LockedFeaturePreview } = await import("@/components/LockedFeaturePreview")

    render(
      <LockedFeaturePreview
        title="Cash Flow Forecast"
        description="Prediksi arus kas tersedia di Pro."
        example="Contoh: surplus bulan depan diproyeksikan dari 6 bulan terakhir."
        href="/upgrade"
      />
    )

    expect(screen.getByText("Contoh: surplus bulan depan diproyeksikan dari 6 bulan terakhir.")).toBeInTheDocument()
  })

  it("renders a neutral unresolved placeholder without CTA or unavailable copy while entitlement resolves", async () => {
    const { default: LockedFeaturePreview } = await import("@/components/LockedFeaturePreview")

    render(
      <LockedFeaturePreview
        title="Health Score"
        description="Ringkasan kesehatan keuangan tersedia di Pro."
        href="/upgrade"
        unresolved
      />
    )

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByText("Memuat ringkasan…")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByText(/tidak tersedia/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/tersedia di Pro/i)).not.toBeInTheDocument()
  })
})
