"use client"
import { useState } from "react"
import { THEME } from "@/app/dashboard/_components/constants"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"

const STATUS_LABELS = {
  overdue: "Terlambat",
  due_today: "Jatuh Tempo Hari Ini",
  due_soon: "Segera Jatuh Tempo",
  upcoming: "Akan Datang",
}

const STATUS_COLORS = {
  overdue: THEME.danger,
  due_today: THEME.warning,
  due_soon: THEME.warning,
  upcoming: THEME.textTertiary,
}

export default function BillPayModal({ bill, onClose, onPaid, onEdit }) {
  const [paying, setPaying] = useState(false)

  const handlePay = async () => {
    setPaying(true)
    try {
      const res = await fetch("/api/bills/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId: bill.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal membayar")
      onPaid(data)
    } catch (err) {
      alert(err.message)
    } finally {
      setPaying(false)
    }
  }

  const statusColor = STATUS_COLORS[bill.status] || THEME.textTertiary
  const statusLabel = STATUS_LABELS[bill.status] || bill.status

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="Detail Tagihan"
      subtitle={bill.kategoriBill}
      size="sm"
      maxHeight="85vh"
    >
      <div className="space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: statusColor + "18", color: statusColor }}
          >
            {statusLabel}
          </span>
          {bill.daysUntilDue < 0 && (
            <span className="text-[10px] font-bold text-earth-500">
              {Math.abs(bill.daysUntilDue)} hari lalu
            </span>
          )}
          {bill.daysUntilDue === 0 && (
            <span className="text-[10px] font-bold text-earth-500">Hari ini</span>
          )}
          {bill.daysUntilDue > 0 && (
            <span className="text-[10px] font-bold text-earth-500">
              {bill.daysUntilDue} hari lagi
            </span>
          )}
        </div>

        {/* Bill info */}
        <div className="rounded-2xl p-4" style={{ background: THEME.surfaceWarm }}>
          <p className="text-xl font-display font-bold text-earth-800 mb-1">{bill.nama}</p>
          <p className="text-2xl font-display font-bold" style={{ color: bill.tipe === "income" ? THEME.income : THEME.expense }}>
            {bill.tipe === "income" ? "+" : "-"}{formatRpFull(bill.jumlah)}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-earth-100">
            <span className="text-xs font-medium text-earth-500">Frekuensi</span>
            <span className="text-xs font-bold text-earth-800 capitalize">{bill.frekuensi}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-earth-100">
            <span className="text-xs font-medium text-earth-500">Kategori Transaksi</span>
            <span className="text-xs font-bold text-earth-800">{bill.kategoriTransaksi}</span>
          </div>
          {bill.akunBank && (
            <div className="flex justify-between items-center py-2 border-b border-earth-100">
              <span className="text-xs font-medium text-earth-500">Akun</span>
              <span className="text-xs font-bold text-earth-800">{bill.akunBank}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-earth-100">
            <span className="text-xs font-medium text-earth-500">Jatuh Tempo</span>
            <span className="text-xs font-bold text-earth-800">Tanggal {bill.tanggalJatuhTempo}</span>
          </div>
          {bill.terakhirDibayar && (
            <div className="flex justify-between items-center py-2 border-b border-earth-100">
              <span className="text-xs font-medium text-earth-500">Terakhir Dibayar</span>
              <span className="text-xs font-bold text-earth-800">{bill.terakhirDibayar}</span>
            </div>
          )}
          {bill.catatan && (
            <div className="py-2">
              <span className="text-xs font-medium text-earth-500 block mb-1">Catatan</span>
              <p className="text-xs text-earth-700">{bill.catatan}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ background: paying ? "#ccc" : THEME.primary }}
          >
            {paying ? "Membayar..." : `Bayar Sekarang · ${formatRpFull(bill.jumlah)}`}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(bill)}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-earth-700 bg-earth-50 active:scale-95 transition-transform"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-earth-500 bg-earth-50 active:scale-95 transition-transform"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
