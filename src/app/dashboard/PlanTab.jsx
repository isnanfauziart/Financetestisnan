"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { Calculator, ArrowRight, Target, Wallet, Receipt, LayoutDashboard, HandCoins, CalendarDays } from "lucide-react"
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
  activeSection,
  onSectionChange,
  onUsageChange,
  onBillsChanged,
  transactionUsage,
  entitlement,
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

  const handleSectionChange = (sectionKey) => {
    if (onSectionChange) {
      onSectionChange(sectionKey)
      return
    }
    setInternalActiveSection(sectionKey)
  }

  return (
    <div className="px-5 pt-4 animate-bento-in" key="plan-tab">
      <div className="space-y-5">
        <nav className="glass rounded-2xl p-2" aria-label="Navigasi Rencana">
          <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-7 gap-2">
            {visibleSections.map((section) => {
              const isActive = currentSection === section.key
              const Icon = section.icon
              return (
                <button
                  key={section.key}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleSectionChange(section.key)}
                  className={`min-h-11 rounded-2xl px-3 py-2.5 text-xs font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${
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
            })}
          </div>
        </nav>

        {currentSection === "overview" && (
          <section className="space-y-4" aria-labelledby="plan-overview-title">
            <div className="rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest p-5 shadow-warm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant">Rencana</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <h2 id="plan-overview-title" className="text-xl font-display font-bold text-md3-on-surface">Rencana bulan ini</h2>
                <span className="text-xs font-semibold text-md3-on-surface-variant">{selectedMonth || "Bulan ini"} {selectedYear || ""}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-md3-on-surface-variant">Pilih satu langkah kecil untuk membuat arus kas bulan ini lebih tenang.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PLAN_PILLARS.map(({ key, feature, label, description, icon: Icon }) => {
                const available = hasFeature(entitlement, feature)
                const tone = PLAN_PILLAR_TONES[key]
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!available}
                    onClick={() => available && handleSectionChange(key)}
                    aria-label={`${available ? "Buka" : "Fitur terkunci"} ${label}`}
                    className={`group min-h-[132px] rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${available ? `border-t-2 ${tone.border} border-md3-outline-variant bg-md3-surface-container-lowest shadow-warm ${tone.hover} active:scale-[0.99]` : "border-md3-outline-variant bg-md3-surface-container-low opacity-70"}`}
                  >
                    <span data-plan-icon-tile className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}>
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="mt-4 block text-sm font-bold text-md3-on-surface">{label}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-md3-on-surface-variant">{available ? description : "Fitur ini belum bisa kamu pakai."}</span>
                    {available && (
                      <span className={`mt-3 inline-flex items-center gap-1 text-[11px] font-bold ${tone.affordance}`}>
                        Buka <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-warm" aria-labelledby="plan-simulation-overview-title">
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
             {!isFeatureEnabled(entitlement, "financialIndependence") ? <LockedFeaturePreview title="Financial Freedom" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(entitlement, "financialIndependence") ? <FITrackerCard netWorth={data?.netWorth} monthlyData={monthlyData} netWorthHistory={netWorthHistory} now={now} /> : <LockedFeaturePreview title="Financial Freedom" description="Pelacak Financial Freedom tersedia di Pro." />}

            {!isFeatureEnabled(entitlement, "whatIf") ? <LockedFeaturePreview title="What-If" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(entitlement, "whatIf") ? <button onClick={onWhatIfOpen} className="w-full bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-4 shadow-warm active:scale-[0.99] transition-transform text-left" aria-label="Open What-If Scenario simulator"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: THEME.primaryBg, color: THEME.primary }}><Calculator size={16} aria-hidden="true" /></div><div><p className="text-sm font-bold text-md3-on-surface">What-If Scenario</p><p className="text-[10px] text-md3-on-surface-variant mt-0.5">Simulasi dampak pengurangan pengeluaran ke goal</p></div></div><ArrowRight size={14} className="text-earth-400" aria-hidden="true" /></div></button> : <LockedFeaturePreview title="What-If" description="Simulasi dampak pengurangan pengeluaran tersedia di Pro." />}
          </div>
        )}
      </div>
    </div>
  )
}
