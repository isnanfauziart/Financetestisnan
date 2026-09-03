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
    expect(content).toContain('{ label: "Produk", href: "#produk" }')
    expect(content).toContain("Anak Masuk Sekolah")
    expect(content).toContain("Kurangi Jajan Rp300.000/bulan")
    expect(content).toContain("Apakah data keuangan saya aman?")
    expect(page).toContain("FAQ_ITEMS")
    expect(page).toContain("application/ld+json")
    expect(page).toContain('getServerSession(authOptions)')
    expect(page).toContain('redirect("/dashboard")')
    expect(page).toContain("tabIndex={-1}")
    const hero = await source("src/components/landing/EditorialHero.jsx")
    expect(hero).not.toContain("Berbasis Google Sheet milikmu, tanpa perlu koneksi bank.")
    expect(hero).toContain('data-hero-stage=""')
    expect(hero).toContain("hero-product-frame")
    expect(hero).toContain("hero-fragment--ledger")
    expect(hero).toContain("hero-fragment--health")
    expect(hero).toContain("hero-fragment--signal")
    expect(hero).not.toContain("data-orbit-card")
    expect(hero).not.toContain("hero-assembled-canvas")
    expect(pricing).toContain("links.upgrade")
    expect(pricing).toContain("<table")
    expect(pricing).toContain("<thead>")

    for (const component of [
      "DataOwnership",
      "EditorialHero",
      "PlatformPillars",
      "ProductShowcase",
      "Faq",
      "FinalCTA",
      "FinancialIntelligence",
      "Footer",
      "ImpactLab",
      "LandingMotion",
      "Navigation",
      "Pricing",
    ]) {
      expect(page).toContain(component)
    }
    expect(page).not.toContain("FutureForecast")
    expect(page).not.toContain("<WhatIfScenario")
  })

  it("keeps most sections server-rendered and isolates required client boundaries", async () => {
    const page = await source("src/app/(landing)/page.js")
    expect(page).not.toMatch(/^\s*["']use client["']/)

    for (const file of [
      "src/components/landing/AuthAwareLink.jsx",
      "src/components/landing/Navigation.jsx",
      "src/components/landing/InsightPlanStage.jsx",
      "src/components/landing/WhatIfScenario.jsx",
      "src/components/landing/LandingMotion.jsx",
      "src/components/landing/PlatformPillars.jsx",
      "src/components/landing/FinancialIntelligence.jsx",
    ]) {
      expect(await source(file)).toMatch(/^\s*["']use client["']/)
    }

    for (const file of [
      "DataOwnership.jsx",
      "EditorialHero.jsx",
      "Faq.jsx",
      "FinalCTA.jsx",
      "Footer.jsx",
      "Pricing.jsx",
    ]) {
      expect(await source(`src/components/landing/${file}`)).not.toMatch(/^\s*["']use client["']/)
    }

    const stage = await source("src/components/landing/InsightPlanStage.jsx")
    expect(stage).toContain('data-product-showcase=""')
    expect(stage).toContain('role="tablist"')
    expect(stage).not.toContain("artami:stage-step")

    const impact = await source("src/components/landing/WhatIfScenario.jsx")
    expect(impact).toContain('aria-label="Pilih simulasi"')

    const intelligence = await source("src/components/landing/FinancialIntelligence.jsx")
    expect(intelligence).toContain('role="tablist"')
    expect(intelligence).toContain('role="tabpanel"')
    expect(intelligence).toContain("ArrowRight")
    expect(intelligence).toContain("Home")
    expect(intelligence).not.toContain("setInterval")

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
    expect(css).toContain(".hero__sticky")
    expect(css).toContain(".hero-product-frame")
    expect(css).toContain(".platform-pillars")
    expect(css).toContain(".product-showcase")
    expect(css).toContain(".intelligence-platform")
    expect(css).toContain(".impact-lab")
    expect(css).not.toContain(".assembled-slot")
    expect(css).toContain("--landing-clay-deep")
    expect(css).not.toContain("landing-float-card")
    expect(css).not.toContain("landing-cta-evidence-drift")
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

  it("uses one stable hero stage with geometry-based card-to-dashboard morphing", async () => {
    const motion = await source("src/components/landing/LandingMotion.jsx")
    const hero = await source("src/components/landing/EditorialHero.jsx")
    const css = await source("src/app/landing.css")

    expect(motion).toContain('[data-hero-stage]')
    expect(motion).toContain("document.fonts")
    expect(motion).toContain("ScrollTrigger.refresh")
    expect(motion).toContain("getHeroMorphTransform")
    expect(motion).toContain("getBoundingClientRect")
    expect(motion).toContain("data-hero-morph-target")
    expect(hero.match(/data-hero-morph-source=/g)).toHaveLength(3)
    expect(hero.match(/data-hero-morph-target=/g)).toHaveLength(3)
    expect(hero).toContain("hero-anomaly-card")
    expect(hero).toContain("<noscript>")
    expect(hero).toContain("landing-noscript-hero")
    expect(css).toMatch(/\.hero-shader,[\s\S]{0,100}\.hero-shader canvas\s*\{[^}]*pointer-events:\s*none/)
    expect(motion).not.toContain("pinSpacing: false")
    expect(motion).not.toContain("data-orbit-card")
    expect(css).toMatch(/@media \(max-width: 47\.99rem\)[\s\S]*\.hero-fragment[^{]*\{[^}]*display:\s*none/)
    expect(css).toMatch(/@media \(max-width: 47\.99rem\)[\s\S]*\.hero-product-frame\s*\{[^}]*width:\s*calc\(100% - 2\.4rem\)/)
    expect(css).toMatch(/@media \(max-width: 47\.99rem\)[\s\S]*\.hero-dashboard__metrics[^{]*\{[^}]*grid-template-columns:\s*1fr/)
    expect(css).toMatch(/@media \(min-width: 48rem\) and \(prefers-reduced-motion: reduce\)[\s\S]*\.hero__sticky\s*\{[^}]*min-height:\s*80rem/)
    expect(css).toMatch(/@media \(min-width: 48rem\) and \(prefers-reduced-motion: reduce\)[\s\S]*\.hero-product-frame\s*\{[^}]*top:\s*32rem/)
  })

  it("keeps continuous landing motion responsive and compositor friendly", async () => {
    const motion = await source("src/components/landing/LandingMotion.jsx")
    const shader = await source("src/components/landing/HeroShader.jsx")
    const css = await source("src/app/landing.css")

    expect(shader).toContain("const SHADER_RENDER_SCALE = 0.72")
    expect(motion).toContain("scrub: 0.2")
    expect(motion).not.toContain("scrub: 0.9")
    expect(motion).not.toContain('borderRadius: "0.65rem"')
    expect(css).not.toMatch(/\.pillar-card\s*\{[^}]*transition:[^}]*\bflex\b/s)
    expect(css).not.toContain("backdrop-filter: blur(10px)")
  })
})

describe("Artami landing art direction refinements", () => {
  it("presents the product as a clean artboard without fake browser chrome", async () => {
    const hero = await source("src/components/landing/EditorialHero.jsx")
    const showcase = await source("src/components/landing/InsightPlanStage.jsx")
    const impact = await source("src/components/landing/WhatIfScenario.jsx")

    expect(hero).not.toContain("product-window__dots")
    expect(hero).not.toContain("app.artami.web.id")
    expect(hero).toContain("Contoh tampilan")
    expect(showcase).not.toContain("<span><i /><i /><i /></span>")
    expect(impact).not.toContain("<span><i /><i /><i /></span>")
  })

  it("moves the approved trust message into the privacy story without a hero trust strip", async () => {
    const page = await source("src/app/(landing)/page.js")
    const showcase = await source("src/components/landing/InsightPlanStage.jsx")
    const ownership = await source("src/components/landing/DataOwnership.jsx")
    const content = await source("src/lib/landingContent.js")

    expect(page).not.toContain("TrustStrip")
    expect(showcase).toContain("Dari catatan menjadi keputusan.")
    expect(showcase).not.toContain("Satu tempat untuk memahami dan bergerak.")
    expect(ownership).toContain("Kami tidak menyimpan data transaksimu.")
    expect(content).toContain("Catatan tetap tersimpan di Google Sheet milikmu—bukan disalin ke database transaksi Artami.")
  })

  it("keeps the privacy band sage and the pricing plus final CTA light", async () => {
    const css = await source("src/app/landing.css")

    expect(css).toMatch(/\.privacy-story \{[^}]*background:\s*var\(--landing-sage\)/)
    expect(css).toMatch(/\.price-card--featured \{[^}]*background:\s*var\(--landing-sage\)/)
    expect(css).toMatch(/\.final-cta \{[^}]*background:\s*transparent/)
    expect(css).not.toContain("cta-evidence")
  })

  it("keeps the directory footer honest and same-origin", async () => {
    const footer = await source("src/components/landing/Footer.jsx")

    expect(footer).toContain('href: "#produk"')
    expect(footer).toContain("links.privacy")
    expect(footer).toContain("links.terms")
    expect(footer).toContain("links.webApp")
    expect(footer).toContain("segera hadir di Play Store")
    expect(footer).not.toMatch(/https?:\/\//)
  })
})
