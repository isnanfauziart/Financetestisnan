"use client"
import { useState, useEffect, useCallback } from "react"
import { Receipt, AlertTriangle, Clock, ChevronRight } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp } from "@/app/dashboard/_components/helpers"

const STATUS_COLORS = {
  overdue: THEME.danger,
  due_today: THEME.warning,
  due_soon: THEME.warning,
  upcoming: THEME.textTertiary,
}

export default function BillsCard({ onPay, onViewAll }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBills = useCallback(async () => {
    try {
      const res = await fetch("/api/bills")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBills((data.bills || []).slice(0, 5))
    } catch {
      // Silently fail — bills tab may not exist yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBills() }, [fetchBills])

  if (loading || bills.length === 0) return null

  const totalUpcoming = bills.reduce((s, b) => s + b.jumlah, 0)

  return (
    <div className="mt-6 animate-bento-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Receipt size={14} style={{ color: THEME.primary }} aria-hidden="true" />
          <h3 className="text-sm font-bold font-display text-earth-800">Tagihan Mendatang</h3>
        </div>
        <button
          onClick={onViewAll}
          className="text-[11px] font-bold text-violet-600 flex items-center gap-1 hover:gap-2 transition-all"
          aria-label="Lihat semua tagihan"
        >
          Lihat Semua <ChevronRight size={12} aria-hidden="true" />
        </button>
      </div>

      <div className="bento-tile bg-white border border-earth-100 shadow-warm p-2 rounded-2xl">
        {bills.map((bill, i) => {
          const statusColor = STATUS_COLORS[bill.status] || THEME.textTertiary
          const isUrgent = bill.status === "overdue" || bill.status === "due_today" || bill.status === "due_soon"
          return (
            <button
              key={bill.id}
              onClick={() => onPay(bill)}
              className={`w-full flex items-center justify-between p-3 pl-4 rounded-2xl border-l-4 hover:bg-earth-50/60 transition-colors animate-fade-in-up stagger-${Math.min(i + 1, 5)} text-left`}
              style={{ borderLeftColor: statusColor }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: statusColor + "18", color: statusColor }}
                >
                  {isUrgent ? <AlertTriangle size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-earth-800 truncate">{bill.nama}</p>
                  <p className="text-[11px] text-earth-500 mt-0.5">
                    {bill.status === "overdue" && `${Math.abs(bill.daysUntilDue)} hari lalu`}
                    {bill.status === "due_today" && "Hari ini"}
                    {bill.status === "due_soon" && "Besok"}
                    {bill.status === "upcoming" && `${bill.daysUntilDue} hari lagi`}
                    {" · tgl "}{bill.tanggalJatuhTempo}
                  </p>
                </div>
              </div>
              <p className="font-bold text-sm flex-shrink-0 ml-2" style={{ color: bill.tipe === "income" ? THEME.income : THEME.expense }}>
                {formatRp(bill.jumlah)}
              </p>
            </button>
          )
        })}

        {/* Total */}
        <div className="flex justify-between items-center px-4 py-2.5 border-t border-earth-100 mt-1">
          <span className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Total</span>
          <span className="text-sm font-bold" style={{ color: THEME.expense }}>
            {formatRp(totalUpcoming)}
          </span>
        </div>
      </div>
    </div>
  )
}
