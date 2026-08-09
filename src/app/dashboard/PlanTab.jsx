"use client"
import { useState } from "react"
import dynamic from "next/dynamic"
import { Calculator, ArrowRight, Target, Wallet, Receipt } from "lucide-react"
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
  { key: "overview", label: "Ringkasan" },
  { key: "goal", label: "Target" },
  { key: "budget", label: "Anggaran" },
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

const PLAN_PILLARS = [
  { key: "goal", feature: "goals", label: "Target", description: "Jaga tujuan yang ingin kamu capai.", icon: Target },
  { key: "budget", feature: "budgets", label: "Anggaran", description: "Atur batas belanja bulan ini.", icon: Wallet },
  { key: "tagihan", feature: "bills", label: "Tagihan", description: "Siapkan pembayaran yang mendekat.", icon: Receipt },
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
              return (
                <button
                  key={section.key}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleSectionChange(section.key)}
                  className={`min-h-11 rounded-2xl px-3 py-2.5 text-xs font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${
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

        {currentSection === "overview" && (
          <section className="space-y-4" aria-labelledby="plan-overview-title">
            <div className="rounded-2xl border border-earth-100 bg-white p-5 shadow-warm">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-earth-500">Rencana</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                <h2 id="plan-overview-title" className="text-xl font-display font-bold text-earth-800">Rencana Bulan Ini</h2>
                <span className="text-xs font-semibold text-earth-500">{selectedMonth || "Bulan ini"} {selectedYear || ""}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-earth-600">Pilih satu langkah kecil untuk membuat arus kas bulan ini lebih tenang.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PLAN_PILLARS.map(({ key, feature, label, description, icon: Icon }) => {
                const available = hasFeature(entitlement, feature)
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!available}
                    onClick={() => available && handleSectionChange(key)}
                    aria-label={`${available ? "Buka" : "Fitur terkunci"} ${label}`}
                    className={`min-h-[132px] rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${available ? "border-earth-100 bg-white shadow-warm hover:border-earth-200 hover:bg-earth-50" : "border-earth-100 bg-earth-50/70 opacity-70"}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-earth-50 text-earth-700">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="mt-4 block text-sm font-bold text-earth-800">{label}</span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-earth-500">{available ? description : "Tersedia setelah akses fitur dibuka."}</span>
                  </button>
                )
              })}
            </div>

            <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-warm" aria-labelledby="plan-simulation-overview-title">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600">
                  <Calculator size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Simulasi</p>
                  <h2 id="plan-simulation-overview-title" className="mt-1 text-lg font-display font-bold text-earth-900">Kalau kebiasaanmu berubah, hasilnya bagaimana?</h2>
                  <p className="mt-2 text-xs leading-relaxed text-earth-700">Lihat efeknya pada target dan waktu pencapaiannya saat kebiasaanmu berubah.</p>
                </div>
              </div>
              {simulationAvailable ? (
                <button
                  type="button"
                  onClick={() => handleSectionChange("simulasi")}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
                >
                  Coba What-If <ArrowRight size={14} aria-hidden="true" />
                </button>
              ) : (
                <p className="mt-4 text-xs font-semibold text-earth-600">Fitur simulasi sedang tidak tersedia.</p>
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
            {!isFeatureEnabled(entitlement, "financialIndependence") ? <LockedFeaturePreview title="Financial Freedom" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(entitlement, "financialIndependence") ? <FITrackerCard netWorth={data?.netWorth} monthlyData={monthlyData} /> : <LockedFeaturePreview title="Financial Freedom" description="Pelacak Financial Freedom tersedia di Pro." />}

            {!isFeatureEnabled(entitlement, "whatIf") ? <LockedFeaturePreview title="What-If" description="Fitur sedang tidak tersedia." unavailable /> : hasFeature(entitlement, "whatIf") ? <button onClick={onWhatIfOpen} className="w-full bento-tile bg-white border border-earth-100 p-4 shadow-warm active:scale-[0.99] transition-transform text-left" aria-label="Open What-If Scenario simulator"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: THEME.primaryBg, color: THEME.primary }}><Calculator size={16} aria-hidden="true" /></div><div><p className="text-sm font-bold text-earth-800">What-If Scenario</p><p className="text-[10px] text-earth-500 mt-0.5">Simulasi dampak pengurangan pengeluaran ke goal</p></div></div><ArrowRight size={14} className="text-earth-400" aria-hidden="true" /></div></button> : <LockedFeaturePreview title="What-If" description="Simulasi dampak pengurangan pengeluaran tersedia di Pro." />}
          </div>
        )}
      </div>
    </div>
  )
}
