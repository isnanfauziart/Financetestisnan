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

const FITrackerCard = dynamic(() => import("@/components/FITrackerCard"), { ssr: false })

const PLAN_SECTIONS = [
  { key: "goal", label: "Goal" },
  { key: "budget", label: "Budget" },
  { key: "tagihan", label: "Tagihan" },
  { key: "simulasi", label: "Simulasi" },
]

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
}) {
  const [internalActiveSection, setInternalActiveSection] = useState("goal")
  const currentSection = activeSection || internalActiveSection

  return (
    <div className="px-5 pt-4 animate-bento-in" key="plan-tab">
      <div className="space-y-5">
        <div className="glass rounded-2xl p-2" role="tablist" aria-label="Navigasi Rencana">
          <div className="grid grid-cols-4 gap-2">
            {PLAN_SECTIONS.map((section) => {
              const isActive = currentSection === section.key
              return (
                <button
                  key={section.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    if (onSectionChange) {
                      onSectionChange(section.key)
                      return
                    }
                    setInternalActiveSection(section.key)
                  }}
                  className={`rounded-2xl px-3 py-2.5 text-xs font-bold transition-all ${
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
        </div>

        {currentSection === "goal" && (
          <GoalsSection
            transactions={transactions}
            onToast={onToast}
            refreshTrigger={goalsRefreshTrigger}
          />
        )}

        {currentSection === "budget" && (
          <div className="space-y-5">
            <BudgetsSection
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedAccount={selectedAccount}
              filteredTransactions={filteredTransactions}
              expenseCategories={expenseCategories}
              onToast={onToast}
            />
          </div>
        )}

        {currentSection === "tagihan" && (
          <BillsSection
            onToast={onToast}
            refreshTrigger={billsRefreshTrigger || 0}
          />
        )}

        {currentSection === "simulasi" && (
          <div className="space-y-5">
            <FITrackerCard
              netWorth={data?.netWorth}
              monthlyData={monthlyData}
            />

            <button
              onClick={onWhatIfOpen}
              className="w-full bento-tile bg-white border border-earth-100 p-4 shadow-warm active:scale-[0.99] transition-transform text-left"
              aria-label="Open What-If Scenario simulator"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: THEME.primaryBg, color: THEME.primary }}>
                    <Calculator size={16} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-earth-800">What-If Scenario</p>
                    <p className="text-[10px] text-earth-500 mt-0.5">Simulasi dampak pengurangan pengeluaran ke goal</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-earth-400" aria-hidden="true" />
              </div>
            </button>

            <DebtsSection onToast={onToast} />

            <EventBudgetsSection
              filteredTransactions={filteredTransactions}
              onToast={onToast}
              refreshTrigger={eventsRefreshTrigger || 0}
            />
          </div>
        )}
      </div>
    </div>
  )
}
