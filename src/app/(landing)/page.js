import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import {
  DATA_OWNERSHIP,
  EVENT_BUDGETS,
  FAQ_ITEMS,
  NAV_ITEMS,
  PRICING_PLANS,
  SCENARIOS,
} from "@/lib/landingContent"
import { SITE_LINKS } from "@/lib/landingLinks"
import DataOwnership from "@/components/landing/DataOwnership"
import EditorialHero from "@/components/landing/EditorialHero"
import Faq from "@/components/landing/Faq"
import FinalCTA from "@/components/landing/FinalCTA"
import FinancialIntelligence from "@/components/landing/FinancialIntelligence"
import Footer from "@/components/landing/Footer"
import ProductShowcase from "@/components/landing/InsightPlanStage"
import LandingMotion from "@/components/landing/LandingMotion"
import Navigation from "@/components/landing/Navigation"
import PlatformPillars from "@/components/landing/PlatformPillars"
import Pricing from "@/components/landing/Pricing"
import ImpactLab from "@/components/landing/WhatIfScenario"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Artami | Keuangan pribadi yang bisa dibaca",
  description:
    "Artami mengubah catatan keuangan di Google Sheets milikmu menjadi insight yang jelas dan bisa ditindaklanjuti.",
  openGraph: {
    title: "Artami | Keuangan pribadi yang bisa dibaca",
    description:
      "Artami mengubah catatan keuangan di Google Sheets milikmu menjadi insight yang jelas dan bisa ditindaklanjuti.",
    url: "https://artami.web.id",
    siteName: "Artami",
    locale: "id_ID",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Artami" }],
  },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="landing-page site-shell">
      <a className="skip-link" href="#konten-utama">
        Langsung ke konten
      </a>

      <Navigation items={NAV_ITEMS} links={SITE_LINKS} />
      <LandingMotion ctaHref={SITE_LINKS.webApp} />

      <main id="konten-utama" tabIndex={-1}>
        <EditorialHero links={SITE_LINKS} />
        <PlatformPillars />
        <ProductShowcase events={EVENT_BUDGETS} />
        <DataOwnership content={DATA_OWNERSHIP} />
        <FinancialIntelligence />
        <ImpactLab scenarios={SCENARIOS} />
        <Pricing plans={PRICING_PLANS} links={SITE_LINKS} />
        <Faq items={FAQ_ITEMS} />
        <FinalCTA links={SITE_LINKS} />
      </main>

      <Footer links={SITE_LINKS} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </div>
  )
}
