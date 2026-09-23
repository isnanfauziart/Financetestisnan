"use client"
import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Calculator, ArrowRight, Target, Wallet, Receipt, LayoutDashboard, HandCoins, CalendarDays } from "lucide-react"
import { THEME } from "./_components/constants"
import useOverflowHint from "./_components/useOverflowHint"
import GoalsSection from "@/components/GoalsSection"
import DebtsSection from "@/components/DebtsSection"
import BudgetsSection from "@/components/BudgetsSection"
import BillsSection from "@/components/BillsSection"
import EventBudgetsSection from "@/components/EventBudgetsSection"
import { BudgetBrief, GoalBrief, BillBrief } from "@/components/PlanBriefSignal"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import { hasFeature, isFeatureEnabled, isProRegistrationOpen } from "@/lib/featureAccess"

const FITrackerCard = dynamic(() => import("@/components/FITrackerCard"), { ssr: false })

const PLAN_SECTIONS = [
  { key: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { key: "goal", label: "Target", icon: Target },
  { key: "budget", label: "Anggaran", icon: Wallet },
  { key: "tagihan", label: "Tagihan", icon: Receipt },
  { key: "utang", label: "Utang", icon: HandCoins },
  { key: "event", label: "Event", icon: CalendarDays },
  { key: "simulasi", label: "Simulasi", icon: Calculator },
]

const PLAN_SECTION_TONES = {
  overview: "bg-md3-surface-container-high text-md3-on-surface-variant",
  goal: "bg-sage-100 text-sage-700",
  budget: "bg-amber-100 text-amber-700",
  tagihan: "bg-clay-100 text-clay-600",
  utang: "bg-rose-100 text-rose-700",
  event: "bg-indigo-100 text-indigo-700",
  simulasi: "bg-violet-100 text-violet-700",
}

const SECTION_FEATURES = {
  goal: "goals",
  budget: "budgets",
  tagihan: "bills",
  utang: "debts",
  event: "momental",
}

const PLAN_PILLARS = [
  { key: "goal", feature: "goals", label: "Target", description: "Jaga tujuan yang ingin kamu capai.", icon: Target },
  { key: "budget", feature: "budgets", label: "Anggaran", description: "Atur batas belanja bulan ini.", icon: Wallet },
  { key: "tagihan", feature: "bills", label: "Tagihan", description: "Siapkan pembayaran yang mendekat.", icon: Receipt },
]

const PLAN_PILLAR_TONES = {
  goal: {
    border: "border-t-sage-400",
    hover: "hover:bg-sage-50",
    icon: "bg-sage-100 text-sage-700",
    affordance: "text-sage-700",
  },
  budget: {
    border: "border-t-amber-400",
    hover: "hover:bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
    affordance: "text-amber-700",
  },
  tagihan: {
    border: "border-t-clay-400",
    hover: "hover:bg-clay-50",
    icon: "bg-clay-100 text-clay-600",
    affordance: "text-clay-600",
  },
}

// Wave 7 decision record: both narrow-screen patterns (scrollable labelled
// rail vs "Lainnya" grouping) were rendered at 360x640 and evaluated against
// the roadmap's mobile, keyboard, focus, discoverability, and overflow checks.
// The scrollable labelled rail passed all five and keeps every planning
// section permanently discoverable, so it ships. See the decision record in
// docs/superpowers/plans and progress.md.
export function getPlanSectionLabel(key) {
  return PLAN_SECTIONS.find(section => section.key === key)?.label || key
}

export default function PlanTab({
  data,
  transactions,
  monthlyData,
  netWorthHistory,
  now,
  goalsRefreshTrigger,
  eventsRefreshTrigger,
  billsRefreshTrigger,
  selectedMonth,
  selectedYear,
  selectedAccount,
  filteredTransactions,
  expenseCategories,
  onToast,
  onWhatIfOpen,
  onDataChanged,
  activeSection,
  onSectionChange,
  onUsageChange,
   onBillsChanged,
   transactionUsage,
   entitlement,
   bills,
   billsLoading,
   billsError,
   settings,
   onSettingsChanged,
   sessionKey,
}) {
  const [internalActiveSection, setInternalActiveSection] = useState("overview")
  const visibleSections = PLAN_SECTIONS.filter(section => {
    if (section.key === "overview") return true
    if (section.key === "simulasi") return isFeatureEnabled(entitlement, "financialIndependence") || isFeatureEnabled(entitlement, "whatIf")
    return hasFeature(entitlement, SECTION_FEATURES[section.key])
  })
  const requestedSection = activeSection || internalActiveSection
  const currentSection = visibleSections.some(section => section.key === requestedSection)
    ? requestedSection
    : visibleSections[0]?.key
  const simulationAvailable = isFeatureEnabled(entitlement, "financialIndependence") || isFeatureEnabled(entitlement, "whatIf")
  const proRegistrationOpen = isProRegistrationOpen(entitlement)
  const scrollRailRef = useRef(null)
  const [railRef, railOverflows] = useOverflowHint()
  // Wave 7 — keep the active section visible in the rail after navigation
  // (deep links, far sections); reduced-motion users get an instant jump.
  useEffect(() => {
    const rail = scrollRailRef.current
    const active = rail?.querySelector('[aria-current="page"]')
    if (!rail || !active || rail.scrollWidth <= rail.clientWidth) return
    const target = Math.max(0, active.offsetLeft - rail.offsetLeft - 8)
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    rail.scrollTo({ left: target, behavior: prefersReducedMotion ? "auto" : "smooth" })
  }, [currentSection])

  const renderSectionButton = section => {
    const isActive = currentSection === section.key
    const Icon = section.icon
    return (
      <button
        key={section.key}
        id={`plan-nav-${section.key}`}
        aria-controls="plan-section-panel"
        type="button"
        aria-current={isActive ? "page" : undefined}
        onClick={() => handleSectionChange(section.key)}
        className={`min-h-11 shrink-0 whitespace-nowrap rounded-2xl px-3 py-2.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${
          isActive
            ? "bg-earth-900 text-white shadow-warm"
            : "bg-md3-surface-container-lowest text-md3-on-surface-variant hover:bg-md3-surface-container-low hover:text-md3-on-surface"
        }`}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <span data-plan-icon-tile className={`flex h-7 w-7 items-center justify-center rounded-xl ${PLAN_SECTION_TONES[section.key]}`}>
            <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span>{section.label}</span>
        </span>
      </button>
    )
  }

  const handleSectionChange = (sectionKey) => {
    if (onSectionChange) {
      onSectionChange(sectionKey)
      return
    }
    setInternalActiveSection(sectionKey)
  }

  return (
    <div className="plan-tab px-5 pt-4 animate-bento-in" key="plan-tab">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="plan-hero" aria-labelledby="plan-page-title">
          <div className="plan-hero__copy">
            <p className="plan-hero__eyebrow">Rencana keuangan</p>
            <h1 id="plan-page-title" tabIndex={-1} className="focus:outline-none">Rencanakan keuanganmu.</h1>
            <p className="plan-hero__description">Atur anggaran, tagihan, dan target bulan ini.</p>
          </div>
          <div className="plan-hero__meta">
            <span className="plan-hero__eyebrow">Bulan dipilih</span>
            <strong>{selectedMonth || "Bulan ini"} {selectedYear || ""}</strong>
          </div>
        </header>

        <nav className="plan-chapter-nav" aria-label="Navigasi Rencana">
          <div className="plan-chapter-nav__scroll" data-plan-nav-prototype="scroll">
            <div ref={element => { scrollRailRef.current = element; railRef.current = element }} className="plan-chapter-nav__rail plan-chapter-nav__rail--scroll">
              {visibleSections.map(renderSectionButton)}
            </div>
            <span className="plan-chapter-nav__fade" aria-hidden="true" />
          </div>
          {railOverflows && (
            <p className="plan-chapter-nav__hint">Geser untuk melihat semua bagian</p>
          )}
        </nav>

        <div key={currentSection} id="plan-section-panel" className="plan-section-transition">
          {currentSection === "overview" && (
            <section className="plan-overview" aria-labelledby="plan-overview-title">
              <div className="plan-overview__header plan-monthly-brief">
                <p className="plan-kicker">Ringkasan bulan</p>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                  <h2 id="plan-overview-title">Rencana bulan ini</h2>
                  <span className="text-xs font-semibold text-md3-on-surface-variant">{selectedMonth || "Bulan ini"} {selectedYear || ""}</span>
                </div>
              <div className="plan-brief-rows">
                {[PLAN_PILLARS[1], PLAN_PILLARS[2], PLAN_PILLARS[0]].map(({ key, feature, label }) => {
                  const available = hasFeature(entitlement, feature)
                  const tone = PLAN_PILLAR_TONES[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!available}
                      onClick={() => available && handleSectionChange(key)}
                      aria-label={`${available ? "Buka" : "Fitur terkunci"} ${label}`}
                      aria-describedby={`${key}-brief-detail${available ? ` ${key}-brief-value` : ""}`}
                      className={`plan-brief-row ${tone.affordance} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2`}
                    >
                      <span className="plan-brief-label">{label}</span>
                      {!available ? <span id={`${key}-brief-detail`} className="plan-brief-detail">Fitur ini belum bisa kamu pakai.</span> : key === "budget" ? <BudgetBrief {...{ selectedMonth, selectedYear, selectedAccount, transactions, prefix: `${key}-brief` }} /> : key === "goal" ? <GoalBrief allocations={data?.balances?.allocations} prefix={`${key}-brief`} /> : <BillBrief {...{ bills, billsLoading, billsError, prefix: `${key}-brief` }} />}
                    </button>
                  )
                })}
              </div>
              </div>

              <section className="plan-secondary-panel" aria-labelledby="plan-simulation-overview-title">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-md3-surface-container-lowest text-violet-600">
                    <Calculator size={18} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Simulasi</p>
                    <h2 id="plan-simulation-overview-title" className="mt-1 text-lg font-display font-bold text-md3-on-surface">Target bebas finansial dan What-If</h2>
                    <p className="mt-2 text-xs leading-relaxed text-md3-on-surface-variant">Dana yang kamu butuhkan dan What-If untuk melihat efek perubahan kebiasaan terhadap waktu pencapaian.</p>
                  </div>
                </div>
                {simulationAvailable ? (
                  <button
                    type="button"
                    onClick={() => handleSectionChange("simulasi")}
                    aria-label="Buka target & What-If"
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
                  >
                    Buka target &amp; What-If <ArrowRight size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <p className="mt-4 text-xs font-semibold text-md3-on-surface-variant">Simulasi belum bisa dipakai saat ini.</p>
                )}
              </section>
            </section>
          )}

          {currentSection === "goal" && hasFeature(entitlement, "goals") && (
            <GoalsSection
              data={data}
              transactions={transactions}
              now={now}
              onToast={onToast}
              refreshTrigger={goalsRefreshTrigger}
              onUsageChange={onUsageChange}
              transactionUsage={transactionUsage}
              proRegistrationOpen={proRegistrationOpen}
              onBalancesChanged={onDataChanged}
            />
          )}

          {currentSection === "budget" && hasFeature(entitlement, "budgets") && (
            <BudgetsSection
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedAccount={selectedAccount}
              filteredTransactions={filteredTransactions}
              expenseCategories={expenseCategories}
              onToast={onToast}
              onUsageChange={onUsageChange}
              bills={bills}
              billsLoading={billsLoading}
              billsError={billsError}
              now={now}
              proRegistrationOpen={proRegistrationOpen}
              entitlement={entitlement}
            />
          )}

          {currentSection === "tagihan" && hasFeature(entitlement, "bills") && (
            <BillsSection
              onToast={onToast}
              refreshTrigger={billsRefreshTrigger || 0}
              onUsageChange={onUsageChange}
              onBillsChanged={onBillsChanged}
              transactionUsage={transactionUsage}
              transactions={transactions}
              now={now}
              entitlement={entitlement}
              settings={settings}
              onSettingsChanged={onSettingsChanged}
              sessionKey={sessionKey}
              proRegistrationOpen={proRegistrationOpen}
            />
          )}

          {currentSection === "utang" && hasFeature(entitlement, "debts") && <DebtsSection onToast={onToast} onUsageChange={onUsageChange} transactionUsage={transactionUsage} proRegistrationOpen={proRegistrationOpen} />}

          {currentSection === "event" && hasFeature(entitlement, "momental") && <EventBudgetsSection filteredTransactions={filteredTransactions} onToast={onToast} refreshTrigger={eventsRefreshTrigger || 0} onUsageChange={onUsageChange} proRegistrationOpen={proRegistrationOpen} />}

          {currentSection === "simulasi" && (
            <div className="space-y-5">
              {!isFeatureEnabled(entitlement, "financialIndependence") ? <LockedFeaturePreview title="Financial Freedom" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} /> : hasFeature(entitlement, "financialIndependence") ? <FITrackerCard netWorth={data?.netWorth} monthlyData={monthlyData} netWorthHistory={netWorthHistory} now={now} /> : <LockedFeaturePreview title="Financial Freedom" description="Pelacak Financial Freedom tersedia di Pro." proRegistrationOpen={proRegistrationOpen} />}

              {!isFeatureEnabled(entitlement, "whatIf") ? <LockedFeaturePreview title="What-If" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} /> : hasFeature(entitlement, "whatIf") ? <button onClick={onWhatIfOpen} className="plan-card w-full p-4 text-left active:scale-[0.99]" aria-label="Open What-If Scenario simulator"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: THEME.primaryBg, color: THEME.primary }}><Calculator size={16} aria-hidden="true" /></div><div><p className="text-sm font-bold text-md3-on-surface">What-If Scenario</p><p className="mt-0.5 text-[10px] text-md3-on-surface-variant">Simulasi dampak pengurangan pengeluaran ke goal</p></div></div><ArrowRight size={14} className="text-earth-400" aria-hidden="true" /></div></button> : <LockedFeaturePreview title="What-If" description="Simulasi dampak pengurangan pengeluaran tersedia di Pro." proRegistrationOpen={proRegistrationOpen} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
