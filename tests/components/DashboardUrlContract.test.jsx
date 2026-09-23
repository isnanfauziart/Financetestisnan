import { describe, expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const source = (path) => readFile(resolve(process.cwd(), path), "utf8")

/**
 * Wave 5 shell wiring contracts. page.js is not renderable in this test
 * environment (same reason as DashboardMotion), so these follow the established
 * source-contract pattern; behavior lives in dashboardUrlState, Sheet,
 * transactionRepeat, QuickAddSheet, and StatsTab (all unit-tested elsewhere).
 */
describe("Wave 5 dashboard wiring contracts", () => {
  it("initializes view state from the URL and keeps the address bar in sync", async () => {
    const page = await source("src/app/dashboard/page.js")
    expect(page).toMatch(/useState\(\(\) => \(typeof window === "undefined" \? null : parseDashboardUrl\(window\.location\.search\)\)\)/)
    expect(page).toContain("diffDashboardUrlState(previousViewStateRef.current, view)")
    expect(page).toContain("window.history.pushState(window.history.state, \"\", url)")
    expect(page).toContain("window.history.replaceState(window.history.state, \"\", url)")
    expect(page).toContain("applyViewState(parseDashboardUrl(window.location.search))")
  })

  it("lets an open sheet consume Back before view state is re-applied", async () => {
    const page = await source("src/app/dashboard/page.js")
    const sheet = await source("src/app/dashboard/_components/Sheet.jsx")
    expect(page).toContain("if (closeTopSheetOnBack()) return")
    expect(sheet).toContain("export function closeTopSheetOnBack()")
    expect(sheet).toContain("__artamiSheetOpen")
    expect(sheet).toContain("Buang perubahan?")
  })

  it("keeps one Quick Add instance for FAB, desktop, empty-state, and repeat entry", async () => {
    const page = await source("src/app/dashboard/page.js")
    // Desktop header action, hidden where the FAB covers the flow.
    expect(page).toMatch(/hidden md:inline-flex[\s\S]{0,400}Tambah transaksi/)
    expect(page).toContain("initialValues={repeatPrefill}")
    expect(page).toContain("onRepeat={handleRepeatTransaction}")
    // Repeat clears before a plain open so a normal Quick Add never inherits it.
    const openIdx = page.indexOf("const openQuickAdd = (type = \"expense\") => {")
    const repeatIdx = page.indexOf("const handleRepeatTransaction = (tx) => {")
    expect(openIdx).toBeGreaterThan(-1)
    expect(repeatIdx).toBeGreaterThan(openIdx)
    expect(page.slice(openIdx, repeatIdx)).toContain("setRepeatTx(null)")
    expect(page.slice(repeatIdx, repeatIdx + 600)).toContain("isRepeatableTransaction(tx)")
  })

  it("passes URL-backed controlled props into StatsTab", async () => {
    const page = await source("src/app/dashboard/page.js")
    expect(page).toContain("controlledSection={statsActiveSection}")
    expect(page).toContain("onSectionChange={setStatsActiveSection}")
    expect(page).toContain("controlledAnalysisMode={analysisMode}")
    expect(page).toContain("onAnalysisModeChange={setAnalysisMode}")
  })

  it("focuses the destination heading after a destination change", async () => {
    const page = await source("src/app/dashboard/page.js")
    expect(page).toContain("id=\"dashboard-heading\" tabIndex={-1}")
    expect(page).toContain("document.getElementById(\"plan-page-title\")")
    expect(page).toContain("if (!tabChanged && !planChanged && !statsChanged) return")
    const plan = await source("src/app/dashboard/PlanTab.jsx")
    expect(plan).toContain("id=\"plan-page-title\" tabIndex={-1}")
  })

  it("gates every repeat affordance on the shared eligibility helper", async () => {
    const page = await source("src/app/dashboard/page.js")
    const home = await source("src/app/dashboard/HomeTab.jsx")
    const recapGroup = await source("src/app/dashboard/_components/RecapMonthGroup.jsx")
    expect(home).toContain("isRepeatableTransaction(t)")
    expect(recapGroup).toContain("isRepeatableTransaction(t)")
    expect(page).toContain("onRepeat={isRepeatableTransaction(t) ? () => onRepeat(t) : undefined}")
  })

  it("marks dirty forms so Back confirms before discarding", async () => {
    const quickAdd = await source("src/app/dashboard/_components/QuickAddSheet.jsx")
    const edit = await source("src/app/dashboard/_components/EditTransactionModal.jsx")
    expect(quickAdd).toContain("dirty={isDirty}")
    expect(edit).toContain("dirty={isDirty}")
  })

  it("focuses the active Rencana section and announces it after deliberate navigation (Wave 7)", async () => {
    const page = await source("src/app/dashboard/page.js")
    expect(page).toContain("setPlanSectionAnnouncement(`Bagian ${getPlanSectionLabel(activePlanSection)} dibuka`)")
    expect(page).toContain("document.querySelector('[aria-controls=\"plan-section-panel\"][aria-current=\"page\"]') || document.getElementById(\"plan-page-title\")")
    expect(page).toContain("role=\"status\" aria-live=\"polite\"")
    const plan = await source("src/app/dashboard/PlanTab.jsx")
    expect(plan).toContain("id=\"plan-section-panel\"")
    expect(plan).toContain("getPlanSectionLabel")
  })

  it("keeps the Rencana navigation decision out of the URL state contract (Wave 7)", async () => {
    const urlState = await source("src/app/dashboard/_components/dashboardUrlState.js")
    expect(urlState).not.toContain("planNavPrototype")
    const plan = await source("src/app/dashboard/PlanTab.jsx")
    // Decision recorded: the scrollable rail shipped; no per-device toggle remains.
    expect(plan).not.toContain("localStorage")
    expect(plan).toContain("plan-chapter-nav__rail--scroll")
  })
})
