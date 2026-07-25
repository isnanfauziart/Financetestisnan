"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react"
import { formatRpFull } from "@/app/dashboard/_components/helpers"

const REJECT_REASONS = ["Bukti tidak jelas", "Nominal tidak sesuai", "Pembayaran belum ditemukan", "Bukti duplikat", "Lainnya"]
const REVOKE_REASONS = ["Dana dikembalikan", "Pembayaran duplikat", "Pembayaran terdeteksi palsu", "Koreksi administratif", "Lainnya"]
const CORRECT_REASONS = ["Kesalahan verifikasi admin", "Bukti pembayaran ditemukan", "Konfirmasi melalui CS", "Lainnya"]

const ACTIONS = {
  approve: {
    title: "Setujui pembayaran",
    submit: "Konfirmasi Setujui",
    done: "Pembayaran disetujui.",
    icon: CheckCircle2,
    tone: "moss",
  },
  reject: {
    title: "Tolak pembayaran",
    submit: "Konfirmasi Tolak",
    done: "Pembayaran ditolak.",
    icon: XCircle,
    tone: "rose",
    reasons: REJECT_REASONS,
  },
  revoke: {
    title: "Cabut akses Pro",
    submit: "Konfirmasi Cabut",
    done: "Akses Pro dicabut.",
    icon: RotateCcw,
    tone: "amber",
    reasons: REVOKE_REASONS,
  },
  correct: {
    title: "Setujui setelah koreksi",
    submit: "Konfirmasi Koreksi",
    done: "Pembayaran dikoreksi dan disetujui.",
    icon: ShieldCheck,
    tone: "violet",
    reasons: CORRECT_REASONS,
  },
}

const STATUS_LABELS = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  revoked: "Dicabut",
  expired: "Berakhir",
  cancelled: "Dibatalkan",
}

const toneClasses = {
  moss: "bg-moss-600 hover:bg-moss-700 focus:ring-moss-200",
  rose: "bg-rose-500 hover:bg-rose-600 focus:ring-rose-200",
  amber: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-200",
  violet: "bg-violet-600 hover:bg-violet-700 focus:ring-violet-200",
}

function paymentEmail(payment) {
  return payment?.email || payment?.user_email || payment?.user?.email || "-"
}

function paymentReference(payment) {
  if (payment?.reference) return payment.reference
  return `PAY-${String(payment?.id || "").replaceAll("-", "").slice(0, 8).toUpperCase()}`
}

function formatDateTime(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date)
}

function getApiError(data, fallback) {
  return data?.error || data?.message || fallback
}

function StatusPill({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    approved: "bg-moss-50 text-moss-700 border-moss-100",
    rejected: "bg-rose-50 text-rose-700 border-rose-100",
    revoked: "bg-earth-100 text-earth-700 border-earth-200",
    expired: "bg-clay-50 text-clay-700 border-clay-100",
    cancelled: "bg-earth-50 text-earth-500 border-earth-100",
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${styles[status] || styles.cancelled}`}>
      {STATUS_LABELS[status] || status || "-"}
    </span>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-earth-100 py-2.5 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-earth-400">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-bold text-earth-800 break-words">{value || "-"}</span>
    </div>
  )
}

function PaymentCard({ payment, onAction, onViewProof }) {
  const reference = paymentReference(payment)
  const isPending = payment.status === "pending"
  const hasProof = payment.hasProof

  return (
    <article className="rounded-3xl border border-earth-100 bg-white/85 p-5 shadow-warm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold text-earth-900">{reference}</h2>
            <StatusPill status={payment.status} />
            {payment.proof_uploaded_late && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                <Clock3 size={13} aria-hidden="true" />
                Bukti terlambat
              </span>
            )}
          </div>
          <div className="grid gap-2 text-sm text-earth-600 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-earth-400">Email</p>
              <p className="font-bold text-earth-800 break-all">{paymentEmail(payment)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-earth-400">Jumlah</p>
              <p className="font-bold text-earth-800">{formatRpFull(payment.amount || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-earth-400">Dibuat</p>
              <p className="font-bold text-earth-800">{formatDateTime(payment.created_at)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-earth-400">Waktu bayar</p>
              <p className="font-bold text-earth-800">{formatDateTime(payment.payment_at)}</p>
            </div>
          </div>
          {(payment.payer_name || payment.rejection_reason || payment.revocation_reason || payment.correction_reason) && (
            <div className="rounded-2xl bg-earth-50 px-4 py-3 text-sm text-earth-600">
              {payment.payer_name && <p><strong className="text-earth-800">Nama pembayar:</strong> {payment.payer_name}</p>}
              {payment.rejection_reason && <p><strong className="text-earth-800">Alasan tolak:</strong> {payment.rejection_reason}{payment.rejection_note ? ` - ${payment.rejection_note}` : ""}</p>}
              {payment.revocation_reason && <p><strong className="text-earth-800">Alasan cabut:</strong> {payment.revocation_reason}{payment.revocation_note ? ` - ${payment.revocation_note}` : ""}</p>}
              {payment.correction_reason && <p><strong className="text-earth-800">Alasan koreksi:</strong> {payment.correction_reason}{payment.correction_note ? ` - ${payment.correction_note}` : ""}</p>}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:w-72 lg:justify-end">
          <button
            type="button"
            disabled={!hasProof}
            onClick={() => onViewProof(payment)}
            className="inline-flex items-center gap-2 rounded-2xl border border-earth-100 bg-white px-4 py-2.5 text-sm font-bold text-earth-700 shadow-sm transition hover:bg-earth-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Lihat Bukti
          </button>
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => onAction("approve", payment)}
                aria-label={`Setujui ${reference}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-moss-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-moss-700 focus:outline-none focus:ring-2 focus:ring-moss-200"
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                Setujui
              </button>
              <button
                type="button"
                onClick={() => onAction("reject", payment)}
                aria-label={`Tolak ${reference}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <XCircle size={16} aria-hidden="true" />
                Tolak
              </button>
            </>
          )}
          {payment.status === "approved" && (
            <button
              type="button"
              onClick={() => onAction("revoke", payment)}
              aria-label={`Cabut ${reference}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <RotateCcw size={16} aria-hidden="true" />
              Cabut
            </button>
          )}
          {payment.status === "rejected" && (
            <button
              type="button"
              onClick={() => onAction("correct", payment)}
              aria-label={`Koreksi ${reference}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-200"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Koreksi
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function ProofDialog({ proofUrl, payment, loading, error, onClose }) {
  if (!payment) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-earth-950/60 p-4 backdrop-blur-sm" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="proof-dialog-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white p-5 shadow-warm-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-earth-400">Bukti pembayaran</p>
            <h2 id="proof-dialog-title" className="font-display text-2xl font-bold text-earth-900">{paymentReference(payment)}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup bukti pembayaran" className="rounded-full p-2 text-earth-500 hover:bg-earth-50">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex min-h-64 flex-1 items-center justify-center overflow-auto rounded-2xl bg-earth-50 p-3">
          {loading && <Loader2 size={28} className="animate-spin text-earth-500" aria-label="Memuat bukti" />}
          {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
          {proofUrl && !loading && !error && <img src={proofUrl} alt={`Bukti pembayaran ${paymentReference(payment)}`} className="max-h-[65vh] max-w-full object-contain" />}
        </div>
      </section>
    </div>
  )
}

function ResultDialog({ result, onClose }) {
  if (!result) return null
  const status = result.payment?.status || "pending"
  const approved = status === "approved"
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-earth-950/50 p-4 backdrop-blur-sm" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="result-dialog-title" className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-warm-xl">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${approved ? "bg-moss-100 text-moss-700" : "bg-earth-100 text-earth-700"}`}>
          {approved ? <CheckCircle2 size={28} aria-hidden="true" /> : <ShieldCheck size={28} aria-hidden="true" />}
        </div>
        <h2 id="result-dialog-title" className="mt-4 font-display text-2xl font-bold text-earth-900">{result.title}</h2>
        <p className="mt-2 text-sm leading-6 text-earth-600">{result.message}</p>
        <div className="mt-4 rounded-2xl bg-earth-50 px-4 py-3 text-sm font-bold text-earth-800">
          {paymentReference(result.payment)} · Status: {STATUS_LABELS[status] || status}
        </div>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-2xl bg-earth-900 px-5 py-3 text-sm font-bold text-white hover:bg-earth-800">
          Tutup
        </button>
      </section>
    </div>
  )
}

function ActionDialog({ draft, error, submitting, onClose, onChange, onSubmit }) {
  const config = draft ? ACTIONS[draft.action] : null
  const payment = draft?.payment
  const reasonRequired = Boolean(config?.reasons)
  const noteRequired = draft?.reason === "Lainnya"
  const valid = !submitting && (!reasonRequired || draft.reason) && (!noteRequired || draft.note.trim())
  if (!draft || !config || !payment) return null

  const Icon = config.icon
  const reference = paymentReference(payment)

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-earth-950/50 p-4 backdrop-blur-sm sm:items-center" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-action-title"
        className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-warm-xl animate-scale-in"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-earth-50">
              <Icon className="text-earth-700" size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 id="admin-action-title" className="font-display text-2xl font-bold text-earth-900">{config.title}</h2>
              <p className="text-sm text-earth-500">Ringkasan wajib dicek sebelum konfirmasi.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-earth-500 transition hover:bg-earth-50 focus:outline-none focus:ring-2 focus:ring-violet-200"
            aria-label="Tutup dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-2xl border border-earth-100 bg-earth-50 px-4 py-2">
          <SummaryRow label="Referensi" value={reference} />
          <SummaryRow label="Email" value={paymentEmail(payment)} />
          <SummaryRow label="Jumlah" value={formatRpFull(payment.amount || 0)} />
          <SummaryRow label="Aksi" value={config.title} />
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {config.reasons && (
            <div>
              <label htmlFor="admin-action-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-earth-500">Alasan</label>
              <select
                id="admin-action-reason"
                value={draft.reason}
                onChange={(event) => onChange({ reason: event.target.value })}
                className="w-full rounded-2xl border border-earth-100 bg-white px-4 py-3 text-sm font-bold text-earth-800 outline-none focus:ring-2 focus:ring-violet-200"
                required
              >
                <option value="">Pilih alasan</option>
                {config.reasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="admin-action-note" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-earth-500">
              Catatan admin {noteRequired ? "(wajib)" : "(opsional)"}
            </label>
            <textarea
              id="admin-action-note"
              value={draft.note}
              onChange={(event) => onChange({ note: event.target.value })}
              rows={3}
              className="w-full resize-none rounded-2xl border border-earth-100 bg-white px-4 py-3 text-sm font-semibold text-earth-800 outline-none focus:ring-2 focus:ring-violet-200"
              placeholder={noteRequired ? "Jelaskan alasan Lainnya" : "Tambahkan konteks audit bila perlu"}
              required={noteRequired}
            />
            {noteRequired && !draft.note.trim() && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600">Catatan wajib untuk alasan Lainnya.</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-2xl border border-earth-100 bg-white px-5 py-3 text-sm font-bold text-earth-700 transition hover:bg-earth-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!valid}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[config.tone]}`}
            >
              {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {config.submit}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function AdminPaymentsClient() {
  const [mode, setMode] = useState("pending")
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [dialogError, setDialogError] = useState("")
  const [draft, setDraft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [restoreEmail, setRestoreEmail] = useState("")
  const [restoreReason, setRestoreReason] = useState("")
  const [restoring, setRestoring] = useState(false)
  const [proof, setProof] = useState(null)
  const [proofUrl, setProofUrl] = useState("")
  const [proofLoading, setProofLoading] = useState(false)
  const [proofError, setProofError] = useState("")
  const [result, setResult] = useState(null)
  const requestSeq = useRef(0)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchPayments = useCallback(async ({ silent = false } = {}) => {
    const seq = ++requestSeq.current
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({
        status: mode,
        search: mode === "history" ? searchQuery.trim() : "",
        page: String(page),
      })
      const res = await fetch(`/api/admin/payments?${params.toString()}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(getApiError(data, "Gagal mengambil pembayaran."))
      if (seq !== requestSeq.current) return
      setPayments(Array.isArray(data.payments) ? data.payments : [])
      setTotal(Number(data.total) || 0)
      setPage(Number(data.page) || page)
      setPageSize(Number(data.pageSize) || 50)
    } catch (err) {
      if (seq === requestSeq.current) setError(err.message)
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [mode, page, searchQuery])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  useEffect(() => {
    if (mode !== "pending") return
    const timer = window.setInterval(() => {
      fetchPayments({ silent: true })
    }, 30000)
    return () => window.clearInterval(timer)
  }, [fetchPayments, mode])

  const visibleRange = useMemo(() => {
    if (!total) return "0"
    const start = (page - 1) * pageSize + 1
    const end = Math.min(total, page * pageSize)
    return `${start}-${end}`
  }, [page, pageSize, total])

  const openAction = (action, payment) => {
    setNotice("")
    setDialogError("")
    setDraft({ action, payment, reason: "", note: "" })
  }

  const viewProof = async (payment) => {
    setProof({ payment })
    setProofUrl("")
    setProofError("")
    setProofLoading(true)
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}/proof`)
      if (!response.ok) throw new Error("Bukti tidak dapat dibuka.")
      const blob = await response.blob()
      if (!blob.type.startsWith("image/")) throw new Error("Format bukti tidak valid.")
      setProofUrl(URL.createObjectURL(blob))
    } catch (err) {
      setProofError(err.message)
    } finally {
      setProofLoading(false)
    }
  }

  const submitAction = async (event) => {
    event.preventDefault()
    if (!draft) return

    setSubmitting(true)
    setDialogError("")
    try {
      const res = await fetch(`/api/admin/payments/${draft.payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: draft.action,
          reason: draft.reason || null,
          note: draft.note.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(getApiError(data, "Gagal memperbarui pembayaran."))
      const updatedPayment = Array.isArray(data.payment) ? data.payment[0] : data.payment
      setResult({
        payment: updatedPayment || draft.payment,
        title: "Pembayaran berhasil diperbarui",
        message: ACTIONS[draft.action].done,
      })
      setDraft(null)
      setMode("history")
      setPage(1)
      setSearchInput("")
      setSearchQuery("")
    } catch (err) {
      setDialogError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setPage(1)
    setNotice("")
    if (nextMode === "pending") {
      setSearchInput("")
      setSearchQuery("")
    }
  }

  const submitSearch = (event) => {
    event.preventDefault()
    setSearchQuery(searchInput)
    setPage(1)
  }

  const restorePro = async (event) => {
    event.preventDefault()
    setRestoring(true)
    setError("")
    try {
      const response = await fetch("/api/admin/users/restore-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: restoreEmail, reason: restoreReason }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(getApiError(data, "Gagal memulihkan Pro."))
      setNotice(`Akses Pro ${data.user.email} berhasil dipulihkan.`)
      setRestoreEmail("")
      setRestoreReason("")
    } catch (err) {
      setError(err.message)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-6 text-earth-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-earth-100 bg-white/80 p-5 shadow-warm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Artami Admin</p>
              <h1 className="font-display text-3xl font-bold text-earth-900">Pembayaran QRIS</h1>
              <p className="mt-1 text-sm text-earth-500">Review bukti pembayaran, koreksi audit, dan riwayat akses Pro.</p>
            </div>
            <button
              type="button"
              onClick={() => fetchPayments({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-earth-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-earth-800 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
              Segarkan
            </button>
          </div>
        </header>

        <details className="rounded-3xl border border-earth-100 bg-white/80 p-5 shadow-warm">
          <summary className="cursor-pointer font-bold text-earth-800">Pulihkan Pro tanpa pembayaran</summary>
          <form onSubmit={restorePro} className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <input
              type="email"
              required
              value={restoreEmail}
              onChange={(event) => setRestoreEmail(event.target.value)}
              placeholder="Email akun"
              aria-label="Email akun"
              className="rounded-2xl border border-earth-100 px-4 py-3 text-sm"
            />
            <input
              type="text"
              required
              value={restoreReason}
              onChange={(event) => setRestoreReason(event.target.value)}
              placeholder="Alasan sah pemulihan Pro"
              aria-label="Alasan pemulihan Pro"
              className="rounded-2xl border border-earth-100 px-4 py-3 text-sm"
            />
            <button
              type="submit"
              disabled={restoring}
              className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {restoring ? "Memulihkan..." : "Pulihkan Pro"}
            </button>
          </form>
        </details>

        <section className="rounded-3xl border border-earth-100 bg-white/80 p-4 shadow-warm" aria-label="Filter pembayaran">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex rounded-2xl bg-earth-50 p-1">
              <button
                type="button"
                onClick={() => changeMode("pending")}
                aria-pressed={mode === "pending"}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-violet-200 ${mode === "pending" ? "bg-white text-earth-900 shadow-sm" : "text-earth-500 hover:text-earth-800"}`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => changeMode("history")}
                aria-pressed={mode === "history"}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-violet-200 ${mode === "history" ? "bg-white text-earth-900 shadow-sm" : "text-earth-500 hover:text-earth-800"}`}
              >
                Riwayat
              </button>
            </div>

            <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="admin-payment-search" className="sr-only">Cari PAY atau email</label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" aria-hidden="true" />
                <input
                  id="admin-payment-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  disabled={mode !== "history"}
                  placeholder="Cari PAY atau email"
                  className="w-full rounded-2xl border border-earth-100 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-earth-800 outline-none transition focus:ring-2 focus:ring-violet-200 disabled:bg-earth-50 disabled:text-earth-300 sm:w-80"
                />
              </div>
              <button
                type="submit"
                disabled={mode !== "history"}
                className="rounded-2xl border border-earth-100 bg-white px-4 py-3 text-sm font-bold text-earth-700 transition hover:bg-earth-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cari
              </button>
            </form>
          </div>
        </section>

        {notice && (
          <div className="rounded-2xl border border-moss-100 bg-moss-50 px-4 py-3 text-sm font-bold text-moss-700" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <section aria-label={mode === "pending" ? "Pembayaran pending" : "Riwayat pembayaran"} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-earth-500">
            <p>
              {mode === "pending" ? "Pending diurutkan paling lama dulu." : "Riwayat: approved, rejected, revoked, expired, cancelled."}
              {mode === "pending" && <span> Polling aktif tiap 30 detik.</span>}
            </p>
            <p className="font-bold">{visibleRange} dari {total} pembayaran</p>
          </div>

          {loading ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-40 rounded-3xl border border-earth-100 bg-white/70 p-5 shadow-warm">
                  <div className="shimmer-bg h-5 w-40 rounded-full" />
                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <div className="shimmer-bg h-12 rounded-2xl" />
                    <div className="shimmer-bg h-12 rounded-2xl" />
                    <div className="shimmer-bg h-12 rounded-2xl" />
                    <div className="shimmer-bg h-12 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : payments.length ? (
            <div className="grid gap-3">
              {payments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  onAction={openAction}
                  onViewProof={viewProof}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-earth-100 bg-white/80 px-5 py-12 text-center shadow-warm">
              <p className="font-display text-2xl font-bold text-earth-900">Tidak ada pembayaran</p>
              <p className="mt-1 text-sm text-earth-500">
                {mode === "pending" ? "Antrian review sedang kosong." : "Coba ubah kata kunci PAY atau email."}
              </p>
            </div>
          )}
        </section>

        {mode === "history" && (
          <nav className="flex flex-col gap-3 rounded-3xl border border-earth-100 bg-white/80 p-4 shadow-warm sm:flex-row sm:items-center sm:justify-between" aria-label="Paginasi riwayat pembayaran">
            <p className="text-sm font-bold text-earth-600">Halaman {page} dari {totalPages} · {pageSize} per halaman</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-2 rounded-2xl border border-earth-100 bg-white px-4 py-2.5 text-sm font-bold text-earth-700 transition hover:bg-earth-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-2 rounded-2xl border border-earth-100 bg-white px-4 py-2.5 text-sm font-bold text-earth-700 transition hover:bg-earth-50 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
      </div>

      <ActionDialog
        draft={draft}
        error={dialogError}
        submitting={submitting}
        onClose={() => !submitting && setDraft(null)}
        onChange={(patch) => setDraft((value) => ({ ...value, ...patch }))}
        onSubmit={submitAction}
      />
      <ProofDialog
        proofUrl={proofUrl}
        payment={proof?.payment}
        loading={proofLoading}
        error={proofError}
        onClose={() => {
          if (proofUrl) URL.revokeObjectURL(proofUrl)
          setProof(null)
          setProofUrl("")
        }}
      />
      <ResultDialog result={result} onClose={() => setResult(null)} />
    </main>
  )
}
