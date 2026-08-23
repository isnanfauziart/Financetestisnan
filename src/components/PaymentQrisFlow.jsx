"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  X,
} from "lucide-react"

import { PAYMENT_AMOUNT, whatsappUrl } from "@/lib/payments"

const QR_PATH = "/payment/qris-gopay.jpeg"
const HISTORY_LIMIT = 20
const ACTIVE_STATUSES = new Set(["awaiting_payment", "pending"])
const FINAL_STATUS_LABELS = {
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  pending: "Menunggu review",
  awaiting_payment: "Menunggu bayar",
}

function addHours(value, hours) {
  return new Date(new Date(value).getTime() + hours * 60 * 60 * 1000)
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value).replace(/\s/g, "")
}

function formatDateWib(value) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(" pukul ", " ").replace(":", ".") + " WIB"
}

function formatDuration(ms) {
  if (ms <= 0) return "00 menit"
  const totalMinutes = Math.ceil(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return [
    days ? `${days} hari` : null,
    hours ? `${hours} jam` : null,
    `${minutes} menit`,
  ].filter(Boolean).join(" ")
}

function toDatetimeLocal(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function apiJson(path, options) {
  const response = await fetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || data.error || "Terjadi kesalahan.")
    error.code = data.error
    throw error
  }
  return data
}

export function getActivePayment(payments) {
  return [...(payments || [])]
    .filter((payment) => ACTIVE_STATUSES.has(payment.status))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null
}

export function getPaymentDeadline(payment) {
  if (!payment) return "-"
  return formatDateWib(payment.expires_at || addHours(payment.created_at, 48))
}

export function getPaymentState(payment, now = new Date()) {
  if (!payment) return { canUpload: false, canReplace: false, inGrace: false, expired: false, remainingMs: 0 }
  const expiresAt = new Date(payment.expires_at || addHours(payment.created_at, 48))
  const graceEndsAt = addHours(expiresAt, 1)
  const time = now.getTime()
  const expired = time > expiresAt.getTime()
  const inGrace = payment.status === "awaiting_payment" && expired && time <= graceEndsAt.getTime()
  return {
    expired,
    inGrace,
    canReplace: inGrace,
    canUpload: payment.status === "awaiting_payment" && time <= graceEndsAt.getTime(),
    remainingMs: Math.max(0, expiresAt.getTime() - time),
  }
}

export default function PaymentQrisFlow() {
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [tier, setTier] = useState("free")
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [available, setAvailable] = useState(true)
  const [copied, setCopied] = useState("")
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState("")
  const [paymentAt, setPaymentAt] = useState(toDatetimeLocal())
  const [payerName, setPayerName] = useState("")
  const [now, setNow] = useState(() => new Date())

  const activePayment = useMemo(() => getActivePayment(payments), [payments])
  const paymentState = useMemo(() => getPaymentState(activePayment, now), [activePayment, now])
  const history = payments.filter((payment) => payment.id !== activePayment?.id)
  const isPro = tier === "pro" || payments.some((payment) => payment.status === "approved")

  useEffect(() => {
    loadPayments(0)
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!file) {
      setPreview("")
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function loadPayments(nextOffset = 0) {
    setLoading(nextOffset === 0)
    setBusy(nextOffset > 0 ? "history" : "")
    setError("")
    try {
      const data = await apiJson(`/api/payments?limit=${HISTORY_LIMIT}&offset=${nextOffset}`)
      setPayments((current) => nextOffset === 0 ? data.payments : [...current, ...data.payments])
      setTotal(data.total || 0)
      setTier(data.tier || "free")
      setOffset(nextOffset + HISTORY_LIMIT)
    } catch (err) {
      if (err.code === "FEATURE_DISABLED") setAvailable(false)
      setError(err.message)
    } finally {
      setLoading(false)
      setBusy("")
    }
  }

  async function startPayment(replaceExpired = false) {
    setBusy(replaceExpired ? "replace" : "start")
    setError("")
    try {
      const data = await apiJson("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replaceExpired ? { replaceExpired: true } : {}),
      })
      setPayments((current) => [
        data.payment,
        ...current
          .filter((payment) => payment.id !== data.payment.id)
          .map((payment) => replaceExpired && payment.id === activePayment?.id ? { ...payment, status: "expired" } : payment),
      ])
      setTotal((current) => current + 1)
    } catch (err) {
      if (err.code === "FEATURE_DISABLED") setAvailable(false)
      setError(err.message)
    } finally {
      setBusy("")
    }
  }

  async function cancelPayment() {
    if (!activePayment) return
    setBusy("cancel")
    setError("")
    try {
      const data = await apiJson(`/api/payments/${activePayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      setPayments((current) => current.map((payment) => payment.id === data.payment.id ? data.payment : payment))
      clearProof()
    } catch (err) {
      if (err.code === "FEATURE_DISABLED") setAvailable(false)
      setError(err.message)
    } finally {
      setBusy("")
    }
  }

  async function submitProof(event) {
    event.preventDefault()
    if (!activePayment || !file) return
    setBusy("upload")
    setError("")
    try {
      const body = new FormData()
      body.set("action", "submit_proof")
      body.set("proof", file)
      body.set("payment_at", new Date(paymentAt).toISOString())
      body.set("payer_name", payerName)
      const data = await apiJson(`/api/payments/${activePayment.id}`, { method: "PATCH", body })
      setPayments((current) => current.map((payment) => payment.id === data.payment.id ? data.payment : payment))
      clearProof()
    } catch (err) {
      if (err.code === "FEATURE_DISABLED") setAvailable(false)
      setError(err.message)
    } finally {
      setBusy("")
    }
  }

  function clearProof() {
    setFile(null)
    setPreview("")
    setPayerName("")
    setPaymentAt(toDatetimeLocal())
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(""), 1500)
    } catch {
      setError("Gagal menyalin. Salin manual dari layar.")
    }
  }

  const supportUrl = whatsappUrl(activePayment?.reference || "Upgrade Artami", "pembayaran QRIS")

  if (!available) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-md3-surface px-4 text-center text-md3-on-surface">
        <section className="max-w-md rounded-3xl border border-md3-outline-variant bg-md3-surface-container-lowest p-8 shadow-warm">
          <h1 className="font-display text-2xl font-bold">Fitur sedang tidak tersedia.</h1>
          <p className="mt-2 text-sm leading-6 text-md3-on-surface-variant">Silakan coba lagi nanti atau hubungi bantuan Artami.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-50 via-white to-moss-50 text-md3-on-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-md3-on-surface-variant hover:text-md3-on-surface">
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali
        </Link>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] bg-earth-900 p-6 text-cream-50 shadow-warm-xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-200">Upgrade lifetime</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              Artami Pro sekali bayar.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-cream-100">
              Bayar via QRIS, unggah bukti, lalu admin mengaktifkan Pro setelah verifikasi.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <InfoTile label="Nominal" value={rupiah(PAYMENT_AMOUNT)} />
              <InfoTile label="Merchant" value="FAWAID DIGITAL STORE, DIGITAL & KREATIF" />
              <InfoTile label="Akses" value="Lifetime" />
            </div>

            {isPro ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-sage-100 p-4 text-sage-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p className="text-sm font-semibold">Akun Anda sudah Pro. Riwayat pembayaran tetap tersedia di bawah.</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-md3-outline-variant bg-md3-surface-container-lowest p-5 shadow-warm-lg md:p-6">
            {loading ? (
              <LoadingPanel />
            ) : activePayment ? (
              activePayment.status === "pending" ? (
                <PendingPanel payment={activePayment} supportUrl={supportUrl} />
              ) : (
                <AwaitingPanel
                  busy={busy}
                  copied={copied}
                  file={file}
                  payment={activePayment}
                  paymentAt={paymentAt}
                  paymentState={paymentState}
                  payerName={payerName}
                  preview={preview}
                  setFile={setFile}
                  setPaymentAt={setPaymentAt}
                  setPayerName={setPayerName}
                  onCancel={cancelPayment}
                  onCopy={copyText}
                  onReplace={() => startPayment(true)}
                  onSubmit={submitProof}
                  onClearProof={clearProof}
                  supportUrl={supportUrl}
                />
              )
            ) : (
              <StartPanel busy={busy} isPro={isPro} onStart={() => startPayment(false)} />
            )}
          </div>
        </section>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
            {error}
          </div>
        ) : null}

        <HistoryPanel
          busy={busy}
          history={history}
          offset={offset}
          total={total}
          onLoadMore={() => loadPayments(offset)}
        />
      </div>
    </main>
  )
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cream-200">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className="flex min-h-[440px] items-center justify-center">
      <div className="flex items-center gap-3 text-md3-on-surface-variant">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span className="text-sm font-semibold">Memuat pembayaran...</span>
      </div>
    </div>
  )
}

function StartPanel({ busy, isPro, onStart }) {
  return (
    <div className="flex min-h-[440px] flex-col justify-center">
      <div className="rounded-3xl bg-md3-surface p-5">
        <p className="text-sm font-semibold text-md3-on-surface-variant">Nominal tetap</p>
        <p className="mt-2 font-display text-4xl font-bold text-md3-on-surface">{rupiah(PAYMENT_AMOUNT)}</p>
        <p className="mt-3 text-sm leading-6 text-md3-on-surface-variant">
          Klik mulai hanya saat Anda siap membayar. Satu akun hanya bisa punya satu pembayaran aktif.
        </p>
      </div>
      <button
        type="button"
        disabled={Boolean(busy) || isPro}
        onClick={onStart}
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-moss-600 px-5 text-sm font-bold text-white shadow-warm transition hover:bg-moss-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "start" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Clock3 className="h-4 w-4" aria-hidden="true" />}
        Mulai pembayaran
      </button>
    </div>
  )
}

function PendingPanel({ payment, supportUrl }) {
  return (
    <div className="flex min-h-[440px] flex-col justify-center gap-4">
      <div className="rounded-3xl bg-amber-50 p-5 text-amber-800">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-md3-on-surface">Bukti sedang ditinjau</h2>
            <p className="mt-2 text-sm leading-6">
              Pembayaran biasanya diproses dalam 1–30 menit. Jika belum terverifikasi setelah 30 menit,
              silakan hubungi CS melalui WhatsApp.
            </p>
            <p className="mt-3 text-xs font-semibold text-amber-700">Referensi: {payment.reference}</p>
          </div>
        </div>
      </div>
      <a
        href={supportUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest px-4 text-sm font-bold text-md3-on-surface-variant hover:bg-md3-surface"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        WhatsApp CS
      </a>
    </div>
  )
}

function AwaitingPanel({
  busy,
  copied,
  file,
  payment,
  paymentAt,
  paymentState,
  payerName,
  preview,
  setFile,
  setPaymentAt,
  setPayerName,
  onCancel,
  onCopy,
  onReplace,
  onSubmit,
  onClearProof,
  supportUrl,
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[0.95fr_1.05fr] lg:grid-cols-1 xl:grid-cols-[0.95fr_1.05fr]">
      <div>
        <div className="overflow-hidden rounded-3xl border border-md3-outline-variant bg-md3-surface p-4">
          <img src={QR_PATH} alt="QRIS GoPay Artami" className="aspect-square w-full rounded-2xl bg-md3-surface-container-lowest object-contain" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={QR_PATH}
            download="artami-qris-gopay.jpeg"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-md3-outline-variant bg-md3-surface-container-lowest text-xs font-bold text-md3-on-surface-variant hover:bg-md3-surface"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Simpan QR
          </a>
          <button
            type="button"
            onClick={() => onCopy(String(PAYMENT_AMOUNT), "nominal")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-md3-outline-variant bg-md3-surface-container-lowest text-xs font-bold text-md3-on-surface-variant hover:bg-md3-surface"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied === "nominal" ? "Tersalin" : "Salin nominal"}
          </button>
        </div>
      </div>

      <div>
        <div className="rounded-3xl border border-md3-outline-variant bg-md3-surface-container-lowest p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-earth-400">Referensi</p>
              <p className="mt-1 text-lg font-bold text-md3-on-surface">{payment.reference}</p>
            </div>
            <button
              type="button"
              onClick={() => onCopy(payment.reference, "reference")}
              className="rounded-xl p-2 text-md3-on-surface-variant hover:bg-md3-surface hover:text-md3-on-surface"
              aria-label="Salin referensi"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Nominal" value={rupiah(PAYMENT_AMOUNT)} />
            <Row label="Merchant" value="Artami QRIS GoPay" />
            <Row label="Deadline" value={getPaymentDeadline(payment)} />
            <Row label="Sisa waktu" value={paymentState.expired ? "Deadline lewat" : formatDuration(paymentState.remainingMs)} />
          </dl>
        </div>

        {paymentState.inGrace ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Deadline sudah lewat. Jika belum sempat membayar, buat QRIS baru agar waktu pembayaran kembali penuh.
              </p>
            </div>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onReplace}
              className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 text-xs font-bold text-white disabled:opacity-50"
            >
              {busy === "replace" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Buat pembayaran baru
            </button>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-bold text-md3-on-surface">Bukti pembayaran</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="mt-2 block w-full rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest px-3 py-2 text-sm text-md3-on-surface-variant file:mr-3 file:rounded-xl file:border-0 file:bg-moss-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-moss-700"
            />
          </label>

          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-md3-outline-variant">
              <img src={preview} alt="Preview bukti pembayaran" className="max-h-56 w-full object-contain bg-md3-surface" />
              <button
                type="button"
                onClick={onClearProof}
                className="absolute right-2 top-2 rounded-full bg-md3-surface-container-lowest p-2 text-md3-on-surface-variant shadow-warm"
                aria-label="Hapus preview bukti"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-bold text-md3-on-surface">Waktu bayar</span>
            <input
              type="datetime-local"
              value={paymentAt}
              onChange={(event) => setPaymentAt(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-md3-outline-variant px-3 text-sm text-md3-on-surface outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-md3-on-surface">Nama pembayar</span>
            <input
              type="text"
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
              maxLength={120}
              placeholder="Opsional"
              className="mt-2 h-11 w-full rounded-2xl border border-md3-outline-variant px-3 text-sm text-md3-on-surface outline-none focus:border-moss-400 focus:ring-2 focus:ring-moss-100"
            />
          </label>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="submit"
              disabled={!file || !paymentState.canUpload || Boolean(busy)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-moss-600 px-4 text-sm font-bold text-white shadow-warm hover:bg-moss-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              Unggah bukti
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-md3-outline-variant px-4 text-sm font-bold text-md3-on-surface-variant hover:bg-md3-surface disabled:opacity-50"
            >
              Batal
            </button>
          </div>

          {!paymentState.canUpload ? (
            <p className="text-xs font-semibold text-rose-600">Waktu unggah bukti sudah berakhir. Batalkan atau hubungi CS.</p>
          ) : null}
        </form>

        {!paymentState.canUpload ? (
          <a
            href={supportUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest text-sm font-bold text-md3-on-surface-variant hover:bg-md3-surface"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp CS
          </a>
        ) : null}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-md3-on-surface-variant">{label}</dt>
      <dd className="text-right font-bold text-md3-on-surface">{value}</dd>
    </div>
  )
}

function HistoryPanel({ busy, history, offset, total, onLoadMore }) {
  const hasMore = offset < total
  return (
    <section className="rounded-[28px] border border-md3-outline-variant bg-md3-surface-container-lowest p-5 shadow-warm md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-md3-on-surface">Riwayat pembayaran</h2>
          <p className="mt-1 text-sm text-md3-on-surface-variant">Maksimal 20 data per muat.</p>
        </div>
        <span className="rounded-full bg-md3-surface-container px-3 py-1 text-xs font-bold text-md3-on-surface-variant">{total} total</span>
      </div>

      {history.length ? (
        <div className="mt-4 divide-y divide-md3-outline-variant">
          {history.map((payment) => (
            <article key={payment.id} className="flex flex-col gap-2 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-md3-on-surface">{payment.reference}</p>
                <p className="text-sm text-md3-on-surface-variant">{formatDateWib(payment.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className="text-sm font-bold text-md3-on-surface">{rupiah(payment.amount || PAYMENT_AMOUNT)}</span>
                <span className="rounded-full bg-md3-surface-container px-3 py-1 text-xs font-bold text-md3-on-surface-variant">
                  {FINAL_STATUS_LABELS[payment.status] || payment.status}
                </span>
              </div>
              </div>
              {(payment.rejection_reason || payment.revocation_reason || payment.correction_reason) ? (
                <p className="text-sm text-md3-on-surface-variant">
                  {payment.rejection_reason || payment.revocation_reason || payment.correction_reason}
                  {(payment.rejection_note || payment.revocation_note || payment.correction_note)
                    ? ` — ${payment.rejection_note || payment.revocation_note || payment.correction_note}`
                    : ""}
                </p>
              ) : null}
              {["rejected", "revoked", "expired"].includes(payment.status) ? (
                <a
                  href={whatsappUrl(
                    payment.reference,
                    payment.status === "rejected" ? "Pembayaran ditolak" :
                      payment.status === "revoked" ? "Akses Pro dicabut" : "Pembayaran kedaluwarsa"
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit text-sm font-bold text-violet-700"
                >
                  Hubungi CS
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-md3-surface p-4 text-sm text-md3-on-surface-variant">
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          Belum ada riwayat pembayaran.
        </div>
      )}

      {hasMore ? (
        <button
          type="button"
          disabled={busy === "history"}
          onClick={onLoadMore}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-md3-outline-variant px-4 text-sm font-bold text-md3-on-surface-variant hover:bg-md3-surface disabled:opacity-50"
        >
          {busy === "history" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Muat lagi
        </button>
      ) : null}
    </section>
  )
}
