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
})
