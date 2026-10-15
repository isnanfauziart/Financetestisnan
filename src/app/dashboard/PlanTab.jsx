"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { Calculator, ArrowRight, ArrowLeft, ChevronDown, Target, Wallet, Receipt, LayoutDashboard, HandCoins, CalendarDays } from "lucide-react"
import { THEME } from "./_components/constants"
import GoalsSection from "@/components/GoalsSection"
import DebtsSection from "@/components/DebtsSection"
import BudgetsSection from "@/components/BudgetsSection"
import BillsSection from "@/components/BillsSection"
import EventBudgetsSection from "@/components/EventBudgetsSection"
import { useAttentionItems, AttentionBand } from "@/components/PlanAttention"
import PlanHubCards from "@/components/PlanHubCards"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import { hasFeature, isFeatureEnabled, getFeatureGate, isProRegistrationOpen } from "@/lib/featureAccess"
import EyeToggle from "./_components/EyeToggle"

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

const SECTION_FEATURES = {
  goal: "goals",
  budget: "budgets",
  tagihan: "bills",
  utang: "debts",
  event: "momental",
}

// Decision record (supersedes Wave 7): both narrow-screen patterns (scrollable
// labelled rail vs "Lainnya" grouping) were rendered at 360x640 and evaluated
// against the roadmap's mobile, keyboard, focus, discoverability, and overflow
// checks. The scrollable labelled rail passed all five and keeps every planning
// section permanently discoverable, so it ships. See the decision record in
// docs/superpowers/plans and progress.md.
// Reversal 2026-10-09: the rail was replaced by the Ringkasan hub — one flat
// pillar list with live status lines, no horizontal scrolling. Rationale: the
// rail hid 2-3 of 7 sections on 360px screens, each pill carried its own accent
// color, and the hub reuses the existing live briefs while keeping every
// section reachable (deep links and the Beranda checklist still address each
// section key directly).
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
   moneyHidden = false,
   onToggleMoneyVisibility,
   onOpenMonthFilter,
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
  // Privacy-eye mode: shared with the Home/Statistik eyes — any eye toggles all.
  const showEye = typeof onToggleMoneyVisibility === "function"

  const attentionItems = useAttentionItems({ entitlement, bills, transactions, selectedMonth, selectedYear, selectedAccount, moneyHidden })

  const handleSectionChange = (sectionKey) => {
    if (onSectionChange) {
      onSectionChange(sectionKey)
      return
    }
    setInternalActiveSection(sectionKey)
  }

  return (
    <div className="plan-tab px-5 pt-4 animate-bento-in" key="plan-tab">
      <div className="mx-auto max-w-6xl space-y-6">
        <header aria-labelledby="plan-page-title">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant">Rencana</p>
            {onOpenMonthFilter ? (
              <button
                type="button"
                onClick={onOpenMonthFilter}
                className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold text-md3-on-surface"
                aria-label="Ubah bulan di Statistik"
              >
                {selectedMonth || "Bulan ini"} {selectedYear || ""} <ChevronDown size={12} aria-hidden="true" />
              </button>
            ) : (
              <span className="inline-flex min-h-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold text-md3-on-surface">
                {selectedMonth || "Bulan ini"} {selectedYear || ""}
              </span>
            )}
            {showEye && <EyeToggle hidden={moneyHidden} onToggle={onToggleMoneyVisibility} />}
          </div>
          <h1 id="plan-page-title" tabIndex={-1} className="focus:outline-none mt-2 font-display text-[1.9rem] font-bold tracking-tight text-md3-on-surface">
            {currentSection === "overview" ? "Rencana bulan ini" : getPlanSectionLabel(currentSection)}
          </h1>
        </header>

        {currentSection !== "overview" && (
          <button
            type="button"
            onClick={() => handleSectionChange("overview")}
            className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-md3-on-surface-variant"
            aria-label="Kembali ke Ringkasan Rencana"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Ringkasan
          </button>
        )}

        <div key={currentSection} id="plan-section-panel" className="plan-section-transition">
          {currentSection === "overview" && (
            <>
              <AttentionBand items={attentionItems} onOpen={(section) => handleSectionChange(section)} />
              <div className="mt-6">
                <PlanHubCards
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  selectedAccount={selectedAccount}
                  transactions={transactions}
                  allocations={data?.balances?.allocations}
                  bills={bills}
                  billsLoading={billsLoading}
                  billsError={billsError}
                  moneyHidden={moneyHidden}
                  entitlement={entitlement}
                  simulationAvailable={simulationAvailable}
                  simulationProLocked={
                    simulationAvailable && !hasFeature(entitlement, "financialIndependence") && !hasFeature(entitlement, "whatIf")
                  }
                  onOpen={(section) => handleSectionChange(section)}
                />
              </div>
            </>
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
              {getFeatureGate(entitlement, "financialIndependence") === "unavailable" ? <LockedFeaturePreview title="Financial Freedom" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} /> : getFeatureGate(entitlement, "financialIndependence") === "unresolved" ? <LockedFeaturePreview title="Financial Freedom" unresolved /> : hasFeature(entitlement, "financialIndependence") ? <FITrackerCard netWorth={data?.netWorth} monthlyData={monthlyData} netWorthHistory={netWorthHistory} now={now} /> : <LockedFeaturePreview title="Financial Freedom" description="Pelacak Financial Freedom tersedia di Pro." example="Contoh: target dana 12× pengeluaran bulanan dengan perkiraan waktu dari surplus tercatat." proRegistrationOpen={proRegistrationOpen} />}

              {getFeatureGate(entitlement, "whatIf") === "unavailable" ? <LockedFeaturePreview title="What-If" description="Fitur sedang tidak tersedia." unavailable proRegistrationOpen={proRegistrationOpen} /> : getFeatureGate(entitlement, "whatIf") === "unresolved" ? <LockedFeaturePreview title="What-If" unresolved /> : hasFeature(entitlement, "whatIf") ? <button onClick={onWhatIfOpen} className="plan-card w-full p-4 text-left active:scale-[0.99]" aria-label="Buka simulator What-If"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: THEME.primaryBg, color: THEME.primary }}><Calculator size={16} aria-hidden="true" /></div><div><p className="text-sm font-bold text-md3-on-surface">What-If Scenario</p><p className="mt-0.5 text-[10px] text-md3-on-surface-variant">Simulasi dampak pengurangan pengeluaran ke goal</p></div></div><ArrowRight size={14} className="text-earth-400" aria-hidden="true" /></div></button> : <LockedFeaturePreview title="What-If" description="Simulasi dampak pengurangan pengeluaran tersedia di Pro." example="Contoh: kurangi jajan Rp 200.000/bulan, goal tercapai 1 bulan lebih cepat." proRegistrationOpen={proRegistrationOpen} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
