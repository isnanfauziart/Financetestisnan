"use client"
import { useMemo } from "react"
import { GraduationCap, Moon, CalendarDays, ArrowDownRight, ArrowUpRight, PiggyBank } from "lucide-react"
import { THEME, EVENT_COLORS } from "@/app/dashboard/_components/constants"
import { formatRp, formatRpFull, useCountUp } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"
import GoalProgressRing from "./GoalProgressRing"
import BudgetProgressBar from "./BudgetProgressBar"

const EVENT_ICONS = {
  "anak-sekolah": GraduationCap,
  "lebaran-thr": Moon,
  "custom": CalendarDays,
}

export default function EventDetailModal({ event, transactions, onClose }) {
  const Icon = EVENT_ICONS[event.tipe] || CalendarDays
  const eventColor = event.tipe === "anak-sekolah" ? EVENT_COLORS["anak-sekolah"] : event.tipe === "lebaran-thr" ? EVENT_COLORS["lebaran-thr"] : EVENT_COLORS.custom
  const pct = event.pct || 0
  const animatedSpent = useCountUp(event.spent || 0)

  const groupedTx = useMemo(() => {
    if (!transactions) return []
    return transactions.slice(0, 20)
  }, [transactions])

  return (
    <Sheet open={true} onClose={onClose} title={event.nama} subtitle="Event Budget" size="md" maxHeight="90vh">
      <div className="space-y-4">
        {/* Overall progress */}
        <div className="rounded-2xl p-4" style={{ background: eventColor + "08", border: `1px solid ${eventColor}22` }}>
          <div className="flex items-center gap-4">
            <GoalProgressRing progress={pct} color={eventColor} size={72} stroke={7} completed={pct >= 100} />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-0.5">Total Terpakai</p>
              <p className="text-xl font-display font-bold" style={{ color: eventColor }}>{formatRpFull(animatedSpent)}</p>
              <p className="text-[11px] text-earth-500">dari {formatRpFull(event.totalBudget)}</p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: pct >= 100 ? THEME.danger : THEME.savings }}>
                Sisa: {formatRpFull(Math.max(0, event.totalBudget - (event.spent || 0)))}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-kategori breakdown */}
        {event.subCategories && event.subCategories.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-2">Sub-Kategori</h4>
            <div className="space-y-3">
              {event.subCategories.map((sub, i) => (
                <div key={i} className="bento-tile bg-white border border-earth-100 p-3 rounded-xl">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-earth-700">{sub.subKategori || sub.kategori}</span>
                    <span className="text-[11px] font-bold" style={{ color: (sub.pct || 0) >= 100 ? THEME.danger : THEME.textPrimary }}>
                      {formatRp(sub.spent || 0)} / {formatRp(sub.limit)}
                    </span>
                  </div>
                  <BudgetProgressBar spent={sub.spent || 0} limit={sub.limit} height={6} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        {groupedTx.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-2">Transaksi Terkait ({transactions.length})</h4>
            <div className="bento-tile bg-white border border-earth-100 shadow-warm p-2 rounded-2xl">
              {groupedTx.map((t, i) => {
                const borderColor = t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.expense
                return (
                  <div key={i} className={`flex items-center justify-between p-2.5 pl-3 rounded-xl border-l-3 animate-fade-in-up stagger-${Math.min(i + 1, 5)}`} style={{ borderLeftColor: borderColor, borderLeftWidth: 3 }}>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: t.type === "income" ? THEME.incomeBg : t.type === "savings" ? THEME.savingsBg : THEME.expenseBg }}>
                        {t.type === "income" ? <ArrowDownRight size={12} color={THEME.income} /> : t.type === "savings" ? <PiggyBank size={12} color={THEME.savings} /> : <ArrowUpRight size={12} color={THEME.expense} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-earth-800 truncate">{t.category}</p>
                        <p className="text-[10px] text-earth-500 truncate">{t.desc || "—"} · {t.date}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold" style={{ color: t.type === "income" ? THEME.income : t.type === "savings" ? THEME.savings : THEME.expense }}>
                        {t.type === "income" ? "+" : ""}{formatRp(t.amount)}
                      </p>
                      {t.eventSubKategori && (
                        <span className="text-[8px] font-bold px-1 py-0.5 rounded-full" style={{ background: eventColor + "18", color: eventColor }}>
                          {t.eventSubKategori}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {transactions.length > 20 && (
                <p className="text-[10px] text-earth-400 text-center py-2">+{transactions.length - 20} transaksi lainnya</p>
              )}
            </div>
          </div>
        )}

        {(!transactions || transactions.length === 0) && (
          <p className="text-xs text-earth-400 text-center py-4">Belum ada transaksi terkait event ini</p>
        )}
      </div>
    </Sheet>
  )
}
