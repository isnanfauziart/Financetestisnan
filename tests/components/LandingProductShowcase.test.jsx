import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ProductShowcase from "@/components/landing/InsightPlanStage"
import ImpactLab from "@/components/landing/WhatIfScenario"

const events = [
  {
    id: "sekolah",
    name: "Anak Masuk Sekolah",
    status: "Aktif",
    date: "15 Juli 2026",
    progress: 68,
    remaining: "Rp2.560.000",
    remainingDetail: "untuk 3 kebutuhan",
    categories: [{ name: "Seragam", amount: "Rp1,2 jt / Rp2 jt", progress: 60 }],
  },
]

const scenarios = [
  {
    id: "kurangi-jajan",
    adjustment: "Kurangi Jajan Rp300.000/bulan",
    outcome: "Target tercapai lebih cepat.",
  },
  {
    id: "tambah-penghasilan",
    adjustment: "Tambah penghasilan Rp1.000.000/bulan",
    outcome: "Setoran target bertambah.",
  },
]

describe("Artami landing product proof", () => {
  it("switches the product workspace without depending on scroll events", () => {
    render(<ProductShowcase events={events} />)

    expect(screen.getByText("Pola yang perlu kamu lihat")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /Budget & tujuan/i }))
    expect(screen.getByRole("heading", { name: "Ruang untuk langkah berikutnya" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: /Event budget/i }))
    expect(screen.getByRole("heading", { name: "Rencana untuk momen besar" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Anak Masuk Sekolah" })).toBeInTheDocument()
  })

  it("updates the impact workspace from an explicit scenario control", () => {
    render(<ImpactLab scenarios={scenarios} />)

    expect(screen.getByText("Agustus 2027")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Tambah penghasilan/i }))
    expect(screen.getByText("Mei 2027")).toBeInTheDocument()
    expect(screen.getByText("Setoran target bertambah.")).toBeInTheDocument()
  })
})
