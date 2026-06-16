import { describe, it, expect } from "vitest"
import { formatRp, formatRpFull, formatInputRupiah, parseTxDate } from "@/app/dashboard/_components/helpers"
import { parseRupiah } from "@/lib/sheets"
import { AVAILABLE_MONTHS, MONTHS_MAP } from "@/app/dashboard/_components/constants"
import { parseDateLoose } from "@/app/dashboard/_components/goalUtils"

describe("formatRp", () => {
  it("formats millions as 'jt'", () => {
    expect(formatRp(1500000)).toBe("Rp 1.5 jt")
  })
  it("formats thousands as 'rb'", () => {
    expect(formatRp(50000)).toBe("Rp 50 rb")
  })
  it("formats small amounts as 'Rp N'", () => {
    expect(formatRp(500)).toBe("Rp 500")
  })
  it("formats zero", () => {
    expect(formatRp(0)).toBe("Rp 0")
  })
})

describe("formatRpFull", () => {
  it("uses IDR locale formatting", () => {
    const out = formatRpFull(1500000)
    expect(out).toMatch(/Rp/)
    expect(out).toMatch(/1\.500\.000/)
  })
})

describe("formatInputRupiah", () => {
  it("strips non-digits and adds thousand dots", () => {
    expect(formatInputRupiah("15000")).toBe("15.000")
  })
  it("strips letters and spaces", () => {
    expect(formatInputRupiah("Rp 1.500")).toBe("1.500")
  })
  it("handles empty string", () => {
    expect(formatInputRupiah("")).toBe("")
  })
})

describe("parseRupiah", () => {
  it("strips dots and parses", () => {
    expect(parseRupiah("1.500.000")).toBe(1500000)
  })
  it("handles empty string", () => {
    expect(parseRupiah("")).toBe(0)
  })
  it("handles garbage", () => {
    expect(parseRupiah("abc")).toBe(0)
  })
})

describe("parseTxDate", () => {
  it("parses '7 Jun 2026' correctly", () => {
    const ts = parseTxDate("7 Jun 2026")
    const d = new Date(ts)
    expect(d.getDate()).toBe(7)
    expect(d.getMonth()).toBe(5)
    expect(d.getFullYear()).toBe(2026)
  })

  it("returns 0 for empty input", () => {
    expect(parseTxDate("")).toBe(0)
    expect(parseTxDate(null)).toBe(0)
    expect(parseTxDate(undefined)).toBe(0)
  })

  it("accepts 'Agu' (Indonesian) for August", () => {
    const ts = parseTxDate("15 Agu 2025")
    expect(new Date(ts).getMonth()).toBe(7)
  })

  it("accepts 'Ags' (English abbreviation) for August (defensive alias)", () => {
    const ts = parseTxDate("15 Ags 2025")
    expect(new Date(ts).getMonth()).toBe(7)
  })

  it("returns 0 for malformed date", () => {
    expect(parseTxDate("not a date")).toBe(0)
  })
})

describe("parseDateLoose", () => {
  it("parses '7 Jun 2026' format", () => {
    const ts = parseDateLoose("7 Jun 2026")
    const d = new Date(ts)
    expect(d.getMonth()).toBe(5)
    expect(d.getDate()).toBe(7)
  })
  it("falls back to Date.parse for ISO format", () => {
    const ts = parseDateLoose("2025-06-15")
    expect(ts).toBeGreaterThan(0)
  })
  it("returns 0 for null/empty", () => {
    expect(parseDateLoose("")).toBe(0)
    expect(parseDateLoose(null)).toBe(0)
  })
})

describe("AVAILABLE_MONTHS (single source of truth)", () => {
  it("uses 'Agu' for August (matches sheet data)", () => {
    expect(AVAILABLE_MONTHS[7]).toBe("Agu")
  })
  it("exports 12 months in order", () => {
    expect(AVAILABLE_MONTHS).toHaveLength(12)
    expect(AVAILABLE_MONTHS[0]).toBe("Jan")
    expect(AVAILABLE_MONTHS[11]).toBe("Des")
  })
})

describe("MONTHS_MAP (defensive parse map)", () => {
  it("maps 'Agu' and 'Ags' both to 7 (August)", () => {
    expect(MONTHS_MAP.Agu).toBe(7)
    expect(MONTHS_MAP.Ags).toBe(7)
  })
  it("maps all 12 canonical month names", () => {
    expect(MONTHS_MAP.Jan).toBe(0)
    expect(MONTHS_MAP.Feb).toBe(1)
    expect(MONTHS_MAP.Mar).toBe(2)
    expect(MONTHS_MAP.Apr).toBe(3)
    expect(MONTHS_MAP.Mei).toBe(4)
    expect(MONTHS_MAP.Jun).toBe(5)
    expect(MONTHS_MAP.Jul).toBe(6)
    expect(MONTHS_MAP.Sep).toBe(8)
    expect(MONTHS_MAP.Okt).toBe(9)
    expect(MONTHS_MAP.Nov).toBe(10)
    expect(MONTHS_MAP.Des).toBe(11)
  })
})
