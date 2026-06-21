"use client"
import { LogOut } from "lucide-react"
import { THEME } from "./_components/constants"
import YearInReviewButton from "@/components/YearInReviewButton"
import MonthlyReportButton from "@/components/MonthlyReportButton"

export default function ProfileTab({ session, data, signOut, soundEnabled, setSoundEnabled, hapticsEnabled, setHapticsEnabled, selectedMonth, selectedYear, filteredTransactions, monthlyData }) {
  return (
    <div className="px-5 pt-4 flex flex-col items-center animate-bento-in" key="profile-tab">
      <div className="relative mb-5">
        <img src={session?.user?.image} alt="" className="w-24 h-24 rounded-3xl border-4 border-white shadow-pop-lg" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-moss-500 border-2 border-white rounded-2xl" />
      </div>
      <h2 className="text-2xl font-display font-bold mb-1 text-earth-900">{session?.user?.name}</h2>
      <p className="text-sm font-medium text-earth-500 mb-6">{session?.user?.email}</p>

      <div className="w-full bento-tile bg-white border border-earth-100 p-5 shadow-warm space-y-4">
        <div className="flex justify-between items-center border-b border-earth-100 pb-3">
          <span className="text-sm font-medium text-earth-500">Account</span>
          <span className="text-sm font-bold text-earth-800">Personal</span>
        </div>
        <div className="flex justify-between items-center border-b border-earth-100 pb-3">
          <span className="text-sm font-medium text-earth-500">Data Source</span>
          <span className="text-sm font-bold text-earth-800">Google Sheets</span>
        </div>
        <div className="flex justify-between items-center border-b border-earth-100 pb-3">
          <span className="text-sm font-medium text-earth-500">Total Transactions</span>
          <span className="text-sm font-bold text-earth-800">{data?.transactions?.length || 0}</span>
        </div>
        <div className="flex justify-between items-center border-b border-earth-100 pb-3">
          <span className="text-sm font-medium text-earth-500">Sound Effects</span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={`Sound effects ${soundEnabled ? "on" : "off"}`}
            aria-pressed={soundEnabled}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: soundEnabled ? THEME.primary : THEME.surfaceWarm }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-warm transition-transform"
              style={{ transform: soundEnabled ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
        </div>
        <div className="flex justify-between items-center border-b border-earth-100 pb-3">
          <span className="text-sm font-medium text-earth-500">Haptic Feedback</span>
          <button
            onClick={() => setHapticsEnabled(!hapticsEnabled)}
            aria-label={`Haptic feedback ${hapticsEnabled ? "on" : "off"}`}
            aria-pressed={hapticsEnabled}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: hapticsEnabled ? THEME.primary : THEME.surfaceWarm }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-warm transition-transform"
              style={{ transform: hapticsEnabled ? "translateX(22px)" : "translateX(2px)" }}
            />
          </button>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })} aria-label="Log out" className="w-full pt-2 flex items-center justify-between group">
          <span className="text-sm font-bold text-rose-500 group-hover:opacity-80 transition-opacity">Log Out</span>
          <LogOut size={16} color={THEME.danger} aria-hidden="true" className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Reports */}
      <div className="w-full space-y-3 mt-4">
        <MonthlyReportButton
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          transactions={filteredTransactions}
          monthlyData={monthlyData}
          allTransactions={data?.transactions || []}
        />
        <YearInReviewButton
          transactions={data?.transactions || []}
          monthlyData={monthlyData}
        />
      </div>
    </div>
  )
}
