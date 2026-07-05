"use client"
import dynamic from "next/dynamic"
import { Calculator, ArrowRight } from "lucide-react"
import { THEME } from "./_components/constants"
import GoalsSection from "@/components/GoalsSection"
import DebtsSection from "@/components/DebtsSection"
import BillsCard from "@/components/BillsCard"
import EventBudgetsCard from "@/components/EventBudgetsCard"

const FITrackerCard = dynamic(() => import("@/components/FITrackerCard"), { ssr: false })

export default function PlanTab({
  data,
  transactions,
  monthlyData,
  goalsRefreshTrigger,
  eventsRefreshTrigger,
  onToast,
  onBillPay,
  onViewBills,
  onWhatIfOpen,
}) {
  return (
    <div className="px-5 pt-4 animate-bento-in" key="plan-tab">
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

        <GoalsSection
          transactions={transactions}
          onToast={onToast}
          refreshTrigger={goalsRefreshTrigger}
        />

        <DebtsSection onToast={onToast} />

        <BillsCard
          onPay={onBillPay}
          onViewAll={onViewBills}
        />

        <EventBudgetsCard />
      </div>
    </div>
  )
}
