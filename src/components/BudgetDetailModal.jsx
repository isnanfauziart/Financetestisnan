"use client"
import { Wallet } from "lucide-react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRp, formatShortDate, useCountUp } from "@/app/dashboard/_components/helpers"
import EmptyState from "@/app/dashboard/_components/EmptyState"
import Sheet from "@/app/dashboard/_components/Sheet"
import BudgetProgressBar from "./BudgetProgressBar"

export default function BudgetDetailModal({ budget, transactions, month, year, onClose }) {
  const total = (transactions || []).reduce((s, t) => s + t.amount, 0)
  const animatedTotal = useCountUp(total)
  const safeLimit = Math.max(budget?.limit || 0, 1)
  const pct = (total / safeLimit) * 100

  return (
    <Sheet
      open={true}
      onClose={onClose}
      subtitle={`Detail Budget · ${month} ${year}`}
      title={budget?.kategori}
      size="md"
      maxHeight="85vh"
    >
      <div className="rounded-2xl p-3 mb-4" style={{ background: THEME.surfaceWarm }}>
        <div className="flex justify-between items-baseline mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500">Terpakai</p>
          <p className="text-xs font-semibold text-earth-600">{formatRp(total)} / {formatRp(budget?.limit || 0)}</p>
        </div>
        <p className="text-2xl font-display font-bold mb-2" style={{ color: pct >= 100 ? THEME.danger : pct >= 90 ? THEME.expense : THEME.textPrimary }}>
          {formatRp(animatedTotal)}
        </p>
        <BudgetProgressBar spent={total} limit={budget?.limit || 0} height={8} />
      </div>

      {(!transactions || transactions.length === 0) ? (
        <EmptyState icon={<Wallet size={20} />} title="Belum ada transaksi" hint="Belum ada pengeluaran untuk kategori ini di bulan ini" />
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500 mb-1">{transactions.length} transaksi</p>
          {transactions.map((t, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-2xl hover:bg-earth-50/80 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-earth-50 flex items-center justify-center font-bold text-[10px] text-earth-600 text-center leading-tight flex-shrink-0">
                {formatShortDate(t.date)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-earth-800 truncate">{t.category}</p>
                <p className="text-[10px] text-earth-500 mt-0.5 truncate">{t.desc || "—"} · {t.account || "Tanpa akun"}</p>
              </div>
              <p className="font-bold text-sm flex-shrink-0" style={{ color: THEME.expense }}>
                -{formatRp(t.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
