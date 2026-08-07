"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { Calculator, ArrowRight } from "lucide-react"
import { THEME } from "./_components/constants"
import GoalsSection from "@/components/GoalsSection"
import DebtsSection from "@/components/DebtsSection"
import BudgetsSection from "@/components/BudgetsSection"
import BillsSection from "@/components/BillsSection"
import EventBudgetsSection from "@/components/EventBudgetsSection"
import LockedFeaturePreview from "@/components/LockedFeaturePreview"
import { hasFeature, isFeatureEnabled } from "@/lib/featureAccess"

const FITrackerCard = dynamic(() => import("@/components/FITrackerCard"), { ssr: false })

const PLAN_SECTIONS = [
  { key: "goal", label: "Tabungan" },
  { key: "budget", label: "Budget" },
  { key: "tagihan", label: "Tagihan" },
  { key: "utang", label: "Utang" },
  { key: "event", label: "Event" },
  { key: "simulasi", label: "Simulasi" },
]

const SECTION_FEATURES = {
  goal: "goals",
  budget: "budgets",
  tagihan: "bills",
  utang: "debts",
  event: "momental",
}

export default function PlanTab({
  data,
  transactions,
  monthlyData,
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
  activeSection,
  onSectionChange,
  onUsageChange,
  onBillsChanged,
  transactionUsage,
  entitlement,
}) {
  const [internalActiveSection, setInternalActiveSection] = useState("goal")
  const visibleSections = PLAN_SECTIONS.filter(section => {
    if (section.key === "simulasi") return isFeatureEnabled(entitlement, "financialIndependence") || isFeatureEnabled(entitlement, "whatIf")
    return hasFeature(entitlement, SECTION_FEATURES[section.key])
  })
  const requestedSection = activeSection || internalActiveSection
  const currentSection = visibleSections.some(section => section.key === requestedSection)
    ? requestedSection
    : visibleSections[0]?.key

  return (
    <div className="px-5 pt-4 animate-bento-in" key="plan-tab">
      <div className="space-y-5">
        <nav className="glass rounded-2xl p-2" aria-label="Navigasi Rencana">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {visibleSections.map((section) => {
              const isActive = currentSection === section.key
              return (
                <button
                  key={section.key}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    if (onSectionChange) {
                      onSectionChange(section.key)
                      return
                    }
                    setInternalActiveSection(section.key)
                  }}
                  className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-earth-900 text-white shadow-warm"
                      : "bg-white/70 text-earth-500 hover:bg-white hover:text-earth-800"
                  }`}
                >
                  {section.label}
                </button>
              )
            })}
          </div>
        </nav>

        {currentSection === "goal" && hasFeature(entitlement, "goals") && (
          <GoalsSection
            data={data}
            transactions={transactions}
            onToast={onToast}
            refreshTrigger={goalsRefreshTrigger}
            onUsageChange={onUsageChange}
            transactionUsage={transactionUsage}
          />
        )}

        {currentSection === "budget" && hasFeature(entitlement, "budgets") && (
          <div className="space-y-5">
            <BudgetsSection
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedAccount={selectedAccount}
              filteredTransactions={filteredTransactions}
              expenseCategories={expenseCategories}
              onToast={onToast}
              onUsageChange={onUsageChange}
            />
          </div>
        )}

        {currentSection === "tagihan" && hasFeature(entitlement, "bills") && (
          <BillsSection
            onToast={onToast}
            refreshTrigger={billsRefreshTrigger || 0}
            onUsageChange={onUsageChange}
            onBillsChanged={onBillsChanged}
            transactionUsage={transactionUsage}
          />
        )}

        {currentSection === "utang" && hasFeature(entitlement, "debts") && <DebtsSection onToast={onToast} onUsageChange={onUsageChange} transactionUsage={transactionUsage} />}

        {currentSection === "event" && hasFeature(entitlement, "momental") && <EventBudgetsSection filteredTransactions={filteredTransactions} onToast={onToast} refreshTrigger={eventsRefreshTrigger || 0} onUsageChange={onUsageChange} />}

        {currentSection === "simulasi" && (
          <div className="space-y-5">
            {!isFeatureEnabled(entitlement, "financialIndependence") ? <LockedFeaturePreview title="Financial Independence" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(entitlement, "financialIndependence") ? <FITrackerCard netWorth={data?.netWorth} monthlyData={monthlyData} /> : <LockedFeaturePreview title="Financial Independence" description="Pelacak financial independence tersedia di Pro." />}

            {!isFeatureEnabled(entitlement, "whatIf") ? <LockedFeaturePreview title="What-If" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(entitlement, "whatIf") ? <button onClick={onWhatIfOpen} className="w-full bento-tile bg-white border border-earth-100 p-4 shadow-warm active:scale-[0.99] transition-transform text-left" aria-label="Open What-If Scenario simulator"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: THEME.primaryBg, color: THEME.primary }}><Calculator size={16} aria-hidden="true" /></div><div><p className="text-sm font-bold text-earth-800">What-If Scenario</p><p className="text-[10px] text-earth-500 mt-0.5">Simulasi dampak pengurangan pengeluaran ke goal</p></div></div><ArrowRight size={14} className="text-earth-400" aria-hidden="true" /></div></button> : <LockedFeaturePreview title="What-If" description="Simulasi dampak pengurangan pengeluaran tersedia di Pro." />}
          </div>
        )}
      </div>
    </div>
  )
}
