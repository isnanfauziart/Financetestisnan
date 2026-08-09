import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import {
  DATA_OWNERSHIP,
  EVENT_BUDGETS,
  FEATURES,
  NAV_ITEMS,
  PRICING_PLANS,
  SCENARIOS,
} from "@/lib/landingContent"
import { SITE_LINKS } from "@/lib/landingLinks"
import DataOwnership from "@/components/landing/DataOwnership"
import EditorialHero from "@/components/landing/EditorialHero"
import EventBudgetRail from "@/components/landing/EventBudgetRail"
import FeatureBento from "@/components/landing/FeatureBento"
import FinalCTA from "@/components/landing/FinalCTA"
import FinancialBriefing from "@/components/landing/FinancialBriefing"
import Footer from "@/components/landing/Footer"
import FutureForecast from "@/components/landing/FutureForecast"
import Navigation from "@/components/landing/Navigation"
import Pricing from "@/components/landing/Pricing"
import WhatIfScenario from "@/components/landing/WhatIfScenario"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Artami | Keuangan pribadi yang bisa dibaca",
  description:
    "Artami mengubah catatan keuangan di Google Sheets milikmu menjadi insight yang jelas dan bisa ditindaklanjuti.",
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

      <main id="konten-utama" tabIndex={-1}>
        <EditorialHero links={SITE_LINKS} />
        <FinancialBriefing />
        <FeatureBento features={FEATURES} />
        <EventBudgetRail events={EVENT_BUDGETS} />
        <FutureForecast />
        <WhatIfScenario scenarios={SCENARIOS} />
        <DataOwnership content={DATA_OWNERSHIP} />
        <Pricing plans={PRICING_PLANS} links={SITE_LINKS} />
        <FinalCTA links={SITE_LINKS} />
      </main>

      <Footer links={SITE_LINKS} />
    </div>
  )
}
