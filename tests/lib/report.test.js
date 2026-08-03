import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { generateAnnualReportHTML, generateReportHTML } from "@/lib/report"

const userName = "Siti <A&B>"

function monthlyData() {
  return {
    month: "Jul",
    year: "2026",
    transactions: [],
    budgets: [],
    allTransactions: [],
    monthlyData: [],
    healthScore: null,
  }
}

describe("report user names", () => {
  it("includes and escapes the supplied name in the monthly HTML report", () => {
    const html = generateReportHTML({ ...monthlyData(), userName })

    expect(html).toContain("Siti &lt;A&amp;B&gt;")
    expect(html).not.toContain(userName)
  })

  it("includes and escapes the supplied name in the annual HTML report", () => {
    const html = generateAnnualReportHTML({
      year: "2026",
      transactions: [],
      monthlyData: [],
      userName,
    })

    expect(html).toContain("Siti &lt;A&amp;B&gt;")
    expect(html).not.toContain(userName)
  })

  it("keeps user-facing callers from reducing names to first names", () => {
    for (const file of [
      "src/app/dashboard/page.js",
      "src/app/dashboard/ProfileTab.jsx",
      "src/components/LegacySheetConnector.jsx",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8")
      expect(source).not.toContain('.split(" ")[0]')
    }
  })
})
