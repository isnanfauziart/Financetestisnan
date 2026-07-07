import { describe, expect, it } from "vitest"

import { ALL_TABS } from "@/lib/sheetManager"

describe("sheetManager schema contracts", () => {
  it("provisions transaction tabs with 15 columns including event fields", () => {
    const txTabs = ALL_TABS.filter(tab => ["Pemasukan", "Pengeluaran", "Tabungan"].includes(tab.name))

    expect(txTabs).toHaveLength(3)
    for (const tab of txTabs) {
      expect(tab.cols).toBe(15)
      expect(tab.headers[0]).toEqual([
        "Tanggal",
        "ID",
        "Keterangan",
        "Kategori",
        "Jumlah",
        "Pajak",
        "Biaya",
        "AkunBank",
        "Net",
        "Catatan",
        "M",
        "Y",
        "Y2",
        "EventID",
        "EventSubKategori",
      ])
    }
  })

  it("provisions goals with the status column", () => {
    const goals = ALL_TABS.find(tab => tab.name === "Goals")

    expect(goals.cols).toBe(9)
    expect(goals.headers[0]).toEqual([
      "ID",
      "Nama",
      "Target",
      "Deadline",
      "Kategori",
      "Icon",
      "Color",
      "CreatedAt",
      "Status",
    ])
  })
})
