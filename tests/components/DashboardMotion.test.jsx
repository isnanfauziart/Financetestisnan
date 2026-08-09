import { describe, expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const source = (path) => readFile(resolve(process.cwd(), path), "utf8")

describe("dashboard motion safeguards", () => {
  it("blurs the focused FAB before applying its hidden state", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain("const fabRef = useRef(null)")
    const blurCall = page.indexOf("if (!visible && fabRef.current === document.activeElement) fabRef.current.blur()")
    const ariaHidden = page.indexOf("aria-hidden={!fabVisible}")
    expect(blurCall).toBeGreaterThanOrEqual(0)
    expect(blurCall).toBeLessThan(ariaHidden)
    expect(page).toContain("setFabVisibility(currentY < lastScrollYRef.current")
    expect(page).toContain("ref={fabRef}")
    expect(page).toContain("tabIndex={fabVisible ? 0 : -1}")
    expect(page).toContain("pointer-events-none motion-safe:translate-y-24 opacity-0")
  })

  it("disables pull-to-refresh transitions and positional transforms for reduced motion", async () => {
    const page = await source("src/app/dashboard/page.js")
    const css = await source("src/app/globals.css")

    expect(page).toContain('className="pull-to-refresh-content relative z-10 max-w-3xl mx-auto"')
    expect(page).toContain('style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)" : "none" }}')
    expect(css).toMatch(/\.pull-to-refresh-content\s*\{[^}]*transform:\s*none\s*!important/)
    expect(css).toMatch(/\.pull-to-refresh-content[\s\S]*?\.pull-to-refresh-indicator[\s\S]*?transition:\s*none\s*!important/)
  })

  it("opens the bottom Rencana navigation on the overview", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain('useState("overview")')
    expect(page).toContain('if (nav.id === "plan") setActivePlanSection("overview")')
  })

  it("passes only enabled insights to Home and Statistik", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain('const gatedInsights = hasFeature(entitlement, "insights") ? insights : []')
    expect(page).toContain("insights={gatedInsights}")
  })
})
