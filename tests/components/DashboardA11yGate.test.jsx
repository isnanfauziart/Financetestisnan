import { describe, expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

const source = (path) => readFile(resolve(process.cwd(), path), "utf8")

/**
 * Wave 10 — final responsive and accessibility gate.
 *
 * page.js is not renderable in this test environment (same reason as
 * DashboardMotion/DashboardUrlContract), so shell-level contracts follow the
 * established source-contract pattern. Component behavior lives in the
 * Sheet/SegmentedButtons/Recap/Avatar tests.
 */
describe("Wave 10 shell contracts", () => {
  it("opts the viewport into device safe areas so env(safe-area-inset-*) resolves", async () => {
    const layout = await source("src/app/layout.js")

    expect(layout).toMatch(/export const viewport = \{[^}]*viewportFit:\s*"cover"/)
  })

  it("lifts the FAB above the bottom nav and notches without covering content", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain('style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}')
    expect(page).toContain("z-[45]")
    // Still in the DOM with the visible-state classes the motion tests pin.
    expect(page).toContain("pointer-events-none motion-safe:translate-y-24 opacity-0")
  })

  it("keeps scrollable content clear of the fixed bottom navigation", async () => {
    const page = await source("src/app/dashboard/page.js")

    // Shell-level bottom padding (larger than nav height + offset) reserves the
    // nav/FAB band for every tab; tabs must not need their own clearance.
    expect(page).toContain("min-h-screen pb-52 sm:pb-44")
    expect(page).toContain("pull-to-refresh-content relative z-10 max-w-3xl mx-auto")
  })

  it("gives keyboard users a skip link to the dashboard heading", async () => {
    const page = await source("src/app/dashboard/page.js")

    expect(page).toContain('href="#dashboard-heading"')
    expect(page).toContain("Langsung ke konten utama")
    // The skip link is the shell's first focusable control (before header actions and FAB).
    const skipIdx = page.indexOf('href="#dashboard-heading"')
    const headerActionIdx = page.indexOf('aria-label="Tambah transaksi baru"')
    expect(skipIdx).toBeGreaterThanOrEqual(0)
    expect(headerActionIdx).toBeGreaterThan(skipIdx)
  })

  it("uses Indonesian accessible labels on shared surfaces", async () => {
    const sheet = await source("src/app/dashboard/_components/Sheet.jsx")
    const recap = await source("src/app/dashboard/_components/RecapMonthGroup.jsx")
    const page = await source("src/app/dashboard/page.js")
    const budget = await source("src/components/BudgetCard.jsx")
    const goal = await source("src/components/GoalCard.jsx")
    const plan = await source("src/app/dashboard/PlanTab.jsx")

    expect(sheet).toContain('aria-label="Tutup"')
    expect(recap).toContain('aria-label="Halaman sebelumnya"')
    expect(recap).toContain("aria-label={`Halaman ${p}`}")
    expect(recap).toContain('aria-label="Halaman berikutnya"')
    expect(recap).toContain('aria-label={`${expanded ? "Tutup" : "Buka"} ringkasan ${headerKey}`}')
    expect(recap).toContain("aria-label={`Hapus ${t.category}`}")
    expect(page).toContain("deleteLabel={`Hapus ${t.category}`}")
    expect(budget).toContain("editLabel={`Edit budget ${budget.kategori}`}")
    expect(budget).toContain("deleteLabel={`Hapus budget ${budget.kategori}`}")
    expect(budget).toContain("aria-label={`Buka rincian budget ${budget.kategori}`}")
    expect(goal).toContain("editLabel={`Edit target ${goal.nama}`}")
    expect(goal).toContain("deleteLabel={`Hapus target ${goal.nama}`}")
    expect(goal).toContain("aria-label={`Kontribusi ke ${goal.nama}`}")
    expect(plan).toContain('aria-label="Buka simulator What-If"')
  })

  it("renders an avatar fallback instead of a bare profile image", async () => {
    const page = await source("src/app/dashboard/page.js")
    const profile = await source("src/app/dashboard/ProfileTab.jsx")
    const avatar = await source("src/components/UserAvatar.jsx")

    // Both former bare <img> call sites now use the shared fallback component.
    expect(page).toContain("<UserAvatar src={session?.user?.image}")
    expect(profile).toContain("<UserAvatar src={session?.user?.image}")
    expect(page).not.toMatch(/<img src=\{session\?\.user\?\.image\}/)
    expect(profile).not.toMatch(/<img src=\{session\?\.user\?\.image\}/)
    expect(avatar).toContain("onError")
  })

  it("extends compact primary controls to 44px touch targets without enlarging them", async () => {
    const segmented = await source("src/app/dashboard/_components/SegmentedButtons.jsx")
    const pill = await source("src/app/dashboard/_components/PillButton.jsx")
    const special = await source("src/app/dashboard/_components/SpecialExpenseField.jsx")
    const css = await source("src/app/globals.css")

    expect(segmented).toMatch(/min-h-\[44px\]/)
    expect(pill).toContain("touch-target-44")
    expect(special).toContain("touch-target-44")
    expect(css).toMatch(/\.touch-target-44\s*\{[^}]*position:\s*relative/)
    expect(css).toMatch(/\.touch-target-44::after\s*\{[^}]*content:\s*""/)
    // Growth is configurable; small chips raise it to reach the 44px minimum.
    expect(css).toMatch(/--tt-grow:\s*4px/)
    expect(pill).toContain('"--tt-grow": "8px"')
    expect(special).toContain('"--tt-grow": "8px"')
  })

  it("keeps the bottom navigation and safe-area helpers in place", async () => {
    const page = await source("src/app/dashboard/page.js")
    const css = await source("src/app/globals.css")

    expect(page).toContain('aria-label="Main navigation"')
    expect(css).toContain(".safe-bottom")
    expect(css).toContain("env(safe-area-inset-bottom")
  })
})
