"use client"
import { useState } from "react"
import { LogOut, Wallet, Calendar } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRpFull, formatInputRupiah } from "./_components/helpers"
import { useSettings } from "@/lib/useSharedData"
import YearInReviewButton from "@/components/YearInReviewButton"
import MonthlyReportButton from "@/components/MonthlyReportButton"
import BillsSection from "@/components/BillsSection"

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—"
  const parts = dateStr.split("-")
  if (parts.length !== 3) return dateStr
  const monthIdx = parseInt(parts[1], 10) - 1
  const monthName = AVAILABLE_MONTHS[monthIdx] || parts[1]
  return `${parseInt(parts[2], 10)} ${monthName} ${parts[0]}`
}

export default function ProfileTab({ session, data, signOut, soundEnabled, setSoundEnabled, hapticsEnabled, setHapticsEnabled, selectedMonth, selectedYear, filteredTransactions, monthlyData, onToast, onRefresh, billsRefreshTrigger }) {
  const { settings, refetch: refetchSettings } = useSettings()
  const [editingSaldo, setEditingSaldo] = useState(false)
  const [rawSaldo, setRawSaldo] = useState("")
  const [editDate, setEditDate] = useState("")
  const [savingSaldo, setSavingSaldo] = useState(false)

  const handleStartEdit = () => {
    setRawSaldo(formatInputRupiah(String(settings.startingBalance)))
    setEditDate(settings.startingBalanceDate || new Date().toISOString().split("T")[0])
    setEditingSaldo(true)
  }

  const handleSaveSaldo = async () => {
    const amount = parseFloat(String(rawSaldo).replace(/\./g, ""))
    if (!amount || amount < 0) {
      onToast("Masukkan jumlah yang valid", "error")
      return
    }
    if (!editDate) {
      onToast("Masukkan tanggal", "error")
      return
    }

    setSavingSaldo(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            ["startingBalance", amount],
            ["startingBalanceDate", editDate],
          ],
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan")
      await refetchSettings()
      if (onRefresh) onRefresh()
      setEditingSaldo(false)
      onToast("Saldo awal diperbarui ✓")
    } catch (err) {
      onToast(err.message, "error")
    }
    setSavingSaldo(false)
  }

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

        {/* Saldo Awal */}
        {editingSaldo ? (
          <div className="border-b border-earth-100 pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-earth-500">Saldo Awal</span>
              <button onClick={() => setEditingSaldo(false)} className="text-xs font-semibold text-earth-400">Batal</button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder={String(settings.startingBalance)}
                value={rawSaldo}
                onChange={e => setRawSaldo(formatInputRupiah(e.target.value))}
                className="flex-1 px-3 py-2 bg-earth-50 border border-earth-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-earth-400 uppercase tracking-wider block mb-1">Tanggal</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full px-3 py-2 bg-earth-50 border border-earth-100 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <button
              onClick={handleSaveSaldo}
              disabled={savingSaldo}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{ background: savingSaldo ? "#ccc" : THEME.primary }}
            >
              {savingSaldo ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        ) : (
          <div className="border-b border-earth-100 pb-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-earth-500">Saldo Awal</span>
              <button
                onClick={handleStartEdit}
                className="text-sm font-bold text-earth-800 hover:text-violet-600 transition-colors flex items-center gap-1"
              >
                <Wallet size={12} />
                {formatRpFull(settings.startingBalance)}
              </button>
            </div>
            {settings.startingBalanceDate && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-earth-400">Per tanggal</span>
                <span className="text-[10px] font-semibold text-earth-500 flex items-center gap-1">
                  <Calendar size={9} />
                  {formatDateDisplay(settings.startingBalanceDate)}
                </span>
              </div>
            )}
          </div>
        )}

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

      {/* Bills */}
      <div className="w-full mt-4">
        <BillsSection onToast={onToast} refreshTrigger={billsRefreshTrigger || 0} />
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
