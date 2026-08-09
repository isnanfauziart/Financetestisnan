import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import FeatureEducation from "@/components/FeatureEducation"

afterEach(() => cleanup())

describe("FeatureEducation", () => {
  it("renders a compact benefit card with a 2x2 step grid, example, and 44px CTA", () => {
    render(
      <FeatureEducation
        title="Bangun target sedikit demi sedikit"
        description="Ubah tujuan besar menjadi langkah yang terasa ringan."
        steps={[
          { icon: <span aria-hidden="true">1</span>, title: "Pilih target", description: "Tentukan tujuanmu." },
          { icon: <span aria-hidden="true">2</span>, title: "Atur jumlah", description: "Isi nominal dan tenggat." },
          { icon: <span aria-hidden="true">3</span>, title: "Catat kontribusi", description: "Tambahkan tabungan." },
          { icon: <span aria-hidden="true">4</span>, title: "Ikuti progres", description: "Lihat perkembangannya." },
        ]}
        example="Dana Darurat / Liburan"
        action={<button type="button">Buat Target</button>}
      />,
    )

    expect(screen.getByRole("article")).toHaveClass("bg-white", "border")
    expect(screen.getByRole("heading", { name: "Bangun target sedikit demi sedikit" })).toBeInTheDocument()
    expect(screen.getByText("Ubah tujuan besar menjadi langkah yang terasa ringan.")).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Langkah" })).toHaveClass("grid-cols-2")
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByText("Contoh")).toBeInTheDocument()
    expect(screen.getByText("Dana Darurat / Liburan")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Buat Target" })).toHaveClass("min-h-11", "min-w-11")
  })
})
