import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { PRICING_PLANS } from "@/lib/landingContent"
import { SITE_LINKS } from "@/lib/landingLinks"

const source = (path) => readFile(resolve(process.cwd(), path), "utf8")

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)

  return channels.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
}

function contrastRatio(first, second) {
  const firstLuminance = luminance(first)
  const secondLuminance = luminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05)
}

function landingToken(css, token) {
  return css.match(new RegExp(`${token}:\\s*(#[0-9a-f]+)`, "i"))?.[1]
}

describe("Artami landing page integration", () => {
  it("keeps every launch link same-origin and Play Store unavailable", () => {
    expect(SITE_LINKS).toMatchObject({
      webApp: "/dashboard",
      upgrade: "/upgrade",
      privacy: "/privacy",
      terms: "/terms",
      playStore: null,
    })
    expect(SITE_LINKS.playStoreAvailable).toBe(false)
    expect(Object.values(SITE_LINKS).filter((value) => typeof value === "string")).not.toContain(
      expect.stringMatching(/^https?:\/\//),
    )
  })

  it("preserves the approved price and content sections", async () => {
    const page = await source("src/app/(landing)/page.js")
    const content = await source("src/lib/landingContent.js")
    const pricing = await source("src/components/landing/Pricing.jsx")

    expect(PRICING_PLANS.find(({ id }) => id === "lifetime")?.price).toBe("Rp40.000")
    expect(content).toContain("Datamu, tetap milikmu.")
    expect(content).toContain("Financial Health Score")
    expect(content).toContain("Anak Masuk Sekolah")
    expect(content).toContain("Kurangi Jajan Rp300.000/bulan")
    expect(page).toContain('getServerSession(authOptions)')
    expect(page).toContain('redirect("/dashboard")')
    expect(page).toContain("tabIndex={-1}")
    expect(pricing).toContain("links.upgrade")
    expect(pricing).toContain("<table")
    expect(pricing).toContain("<thead>")

    for (const component of [
      "DataOwnership",
      "EditorialHero",
      "EventBudgetRail",
      "FeatureBento",
      "FinalCTA",
      "FinancialBriefing",
      "Footer",
      "FutureForecast",
      "Navigation",
      "Pricing",
      "WhatIfScenario",
    ]) {
      expect(page).toContain(component)
    }
  })

  it("keeps most sections server-rendered and isolates required client boundaries", async () => {
    const page = await source("src/app/(landing)/page.js")
    expect(page).not.toMatch(/^\s*["']use client["']/)

    for (const file of [
      "src/components/landing/AuthAwareLink.jsx",
      "src/components/landing/Navigation.jsx",
      "src/components/landing/FeatureBento.jsx",
      "src/components/landing/HeroShader.jsx",
    ]) {
      expect(await source(file)).toMatch(/^\s*["']use client["']/)
    }

    for (const file of [
      "DataOwnership.jsx",
      "EditorialHero.jsx",
      "EventBudgetRail.jsx",
      "FinalCTA.jsx",
      "FinancialBriefing.jsx",
      "Footer.jsx",
      "FutureForecast.jsx",
      "Pricing.jsx",
      "WhatIfScenario.jsx",
    ]) {
      expect(await source(`src/components/landing/${file}`)).not.toMatch(/^\s*["']use client["']/)
    }

    const eventRail = await source("src/components/landing/EventBudgetRail.jsx")
    expect(eventRail).toContain("event-detail-rail")
    expect(eventRail).toContain("#event-${event.id}")
    expect(eventRail).not.toContain("aria-current")
    expect(eventRail).not.toContain("event-option--active")

    const authLink = await source("src/components/landing/AuthAwareLink.jsx")
    expect(authLink).toContain('signIn("google", { callbackUrl: href })')
    expect(authLink).toContain("href={href}")
  })

  it("uses the landing page metadata", async () => {
    const page = await source("src/app/(landing)/page.js")
    const layout = await source("src/app/(landing)/layout.js")
    const rootLayout = await source("src/app/layout.js")

    expect(page).toContain('title: "Artami | Keuangan pribadi yang bisa dibaca"')
    expect(page).toContain("Google Sheets milikmu")
    expect(layout).toContain('import "../landing.css"')
    expect(rootLayout).not.toContain('import "./landing.css"')
  })

  it("scopes landing styling while retaining accessibility and motion safeguards", async () => {
    const css = await source("src/app/landing.css")

    expect(css).toContain(".landing-page")
    expect(css).toMatch(/\.landing-page[^\n]*focus-visible/)
    expect(css).toMatch(/prefers-reduced-motion/)
    expect(css).toMatch(/\.landing-page[\s\S]{0,400}overflow-x/)
    expect(css).toContain("scroll-margin-top")
    expect(css).toContain(":has(.event-detail:target)")
    expect(css).toContain("--landing-clay-deep")
    expect(css).toContain(".price-card--featured a:focus-visible")
    expect(css).not.toMatch(/^\s*(?:html|body|:root)\s*\{/m)
    expect(css).not.toMatch(/^\s*\*\s*\{/m)
  })

  it("keeps muted and clay text readable on light landing surfaces", async () => {
    const css = await source("src/app/landing.css")
    const muted = landingToken(css, "--landing-muted")
    const clayDeep = landingToken(css, "--landing-clay-deep")

    expect(contrastRatio(muted, "#e9e1d5")).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(muted, "#dde6d6")).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(clayDeep, "#f4efe6")).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(clayDeep, "#ffffff")).toBeGreaterThanOrEqual(4.5)
    expect(css).toMatch(/\.event-ring strong \{[^}]*color: var\(--landing-clay-deep\)/)
    expect(css).toMatch(/\.pro-badge \{[^}]*color: var\(--landing-clay-deep\)/)
    expect(css).toMatch(/\.comparison-row > td:last-child \{[^}]*color: var\(--landing-clay-deep\)/)
  })

  it("removes the app-shell fixed background paint on the landing route", async () => {
    const css = await source("src/app/landing.css")

    expect(css).toMatch(/body:has\(\.landing-page\)\s*\{[^}]*background-image:\s*none/)
    expect(css).toMatch(/body:has\(\.landing-page\)\s*\{[^}]*background-attachment:\s*scroll/)
  })
})
