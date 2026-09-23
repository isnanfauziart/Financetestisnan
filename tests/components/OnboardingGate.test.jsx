import { describe, expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const source = (path) => readFile(resolve(process.cwd(), path), "utf8")

/**
 * Wave 4 shell-gate wiring contracts. page.js is not renderable in this test
 * environment (same reason as DashboardMotion), so these follow the
 * established source-contract pattern; behavior lives in useOnboardingState
 * (unit-tested), OnboardingOverlay (component-tested), and the settings route
 * (API-tested).
 */
describe("Wave 4 required-first-use gate wiring", () => {
  it("derives the gate from Sheet state and renders the overlay in its own provider scope", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain("deriveOnboardingState({")
    expect(page).toContain("transactions: data?.transactions || []")
    expect(page).toContain("settingsLoading")
    expect(page).toContain("settingsError")
    expect(page).toContain("if (onboardingEngaged) {")
    expect(page).toContain("<SharedDataScopeContext.Provider value={sessionKey || \"\"}>")
    expect(page).toContain("<OnboardingOverlay")
    expect(page).toContain("step={onboardingStep}")
    expect(page).toContain("submitTransaction={submitTransaction}")
  })

  it("replaces the whole shell and suppresses the ordinary Quick Add mount", async () => {
    const page = await source("src/app/dashboard/page.js")
    const quickAdd = await source("src/app/dashboard/_components/QuickAddSheet.jsx")

    // The gate returns before the shell markup, so tabs/FAB/bottom nav are out
    // of reach; Quick Add itself refuses to render while the gate is engaged.
    const gateIndex = page.indexOf("if (onboardingEngaged) {")
    const shellIndex = page.indexOf("<PaymentStatusBanner")
    expect(gateIndex).toBeGreaterThan(0)
    expect(shellIndex).toBeGreaterThan(gateIndex)
    expect(page).toContain("suppress={onboardingActive}")
    expect(quickAdd).toContain("if (suppress) return null")
  })

  it("guards browser Back with a history sentinel only while the gate is engaged", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain("window.history.pushState(sentinel, \"\")")
    expect(page).toContain("window.addEventListener(\"popstate\", onPopState)")
    expect(page.indexOf("if (!onboardingActive")).toBeGreaterThan(0)
  })

  it("persists the opening balance through the settings route and refreshes cached feeds", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain("[\"startingBalance\", amount]")
    expect(page).toContain("[\"startingBalanceDate\", date]")
    expect(page).toContain("method: \"PUT\"")
    expect(page).toContain("await Promise.all([refetchSettings(), fetchData()])")
  })

  it("no longer mounts the dismissible opening-balance prompt", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).not.toContain("<SetupSaldoAwal")
    expect(page).not.toContain("saldoAwalDismissed")
  })

  it("keeps the first transaction on the shared submit pipeline and offers optional next steps", async () => {
    const page = await source("src/app/dashboard/page.js")
    const overlay = await source("src/app/dashboard/_components/OnboardingOverlay.jsx")

    expect(overlay).toContain("<QuickAddSheet")
    expect(overlay).toContain("submitTransaction(payload)")
    expect(page).toContain("onFirstTransactionSaved=")
    expect(page).toContain("onOpenPlan={openPlanSection}")
    expect(overlay).toContain('onOpenPlan("budget")')
    expect(overlay).toContain('onOpenPlan("goal")')
  })
})
