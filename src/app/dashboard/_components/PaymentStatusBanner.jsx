"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

const COPY = {
  approved: ["Akses Pro aktif", "Pembayaran Anda telah disetujui. Akses Pro sekarang aktif."],
  rejected: ["Pembayaran ditolak", "Lihat alasan penolakan dan pilihan bantuan di halaman pembayaran."],
  revoked: ["Akses Pro dicabut", "Lihat alasan pencabutan dan hubungi CS jika memerlukan bantuan."],
}

export default function PaymentStatusBanner() {
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    fetch("/api/payments?limit=1")
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        const latest = result?.payments?.[0]
        if (!latest || !COPY[latest.status]) return
        const key = `artami-payment-dismissed:${latest.id}:${latest.status}`
        if (localStorage.getItem(key) !== "1") setPayment({ ...latest, dismissalKey: key })
      })
      .catch(() => {})
  }, [])

  if (!payment) return null
  const [title, message] = payment.corrected_at && payment.status === "approved"
    ? ["Akses Pro aktif", "Pembayaran Anda telah disetujui setelah peninjauan ulang. Akses Pro sekarang aktif."]
    : COPY[payment.status]

  return (
    <div className="mx-5 mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-earth-800" role="status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm text-earth-600">{message}</p>
          <Link href="/upgrade" className="mt-2 inline-block text-sm font-bold text-violet-700">
            Lihat pembayaran
          </Link>
        </div>
        <button
          type="button"
          aria-label="Tutup pemberitahuan pembayaran"
          className="rounded-lg px-2 py-1 text-earth-500 hover:bg-white"
          onClick={() => {
            localStorage.setItem(payment.dismissalKey, "1")
            setPayment(null)
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

