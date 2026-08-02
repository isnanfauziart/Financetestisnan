"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, X } from "lucide-react"
import { formatRpFull } from "@/app/dashboard/_components/helpers"

const EMPTY_SUMMARY = { total: 0, free: 0, paid: 0, active7d: 0, sheetConnected: 0 }

function formatDate(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(date)
}

function formatDateTime(value) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date) + " WIB"
}

function formatActivity(value) {
  return value ? formatDateTime(value) : "Belum aktif"
}

function apiError(data, fallback) {
  return data?.message || data?.error || fallback
}

async function fetchJson(url) {
  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(apiError(data, "Gagal memuat data pengguna."))
  return data
}

function StatusPill({ children, tone = "earth" }) {
  const styles = {
    earth: "border-earth-100 bg-earth-50 text-earth-600",
    moss: "border-moss-100 bg-moss-50 text-moss-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  }
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${styles[tone]}`}>{children}</span>
}

function SummaryCard({ label, value, tone = "earth" }) {
  return (
    <div className="rounded-2xl border border-earth-100 bg-white/85 px-4 py-3 shadow-warm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-earth-400">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone === "violet" ? "text-violet-700" : tone === "moss" ? "text-moss-700" : "text-earth-900"}`}>{value}</p>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-earth-100 py-2.5 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-earth-400">{label}</span>
      <span className="max-w-[65%] break-words text-right text-sm font-bold text-earth-800">{value || "-"}</span>
    </div>
  )
}

function LoadingText({ label = "Memuat..." }) {
  return <p className="flex items-center gap-2 text-sm font-semibold text-earth-500"><Loader2 size={16} className="animate-spin" aria-hidden="true" />{label}</p>
}

function SectionError({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      <p className="font-semibold">{message}</p>
      <button type="button" onClick={onRetry} className="mt-2 font-bold underline underline-offset-2">Coba lagi</button>
    </div>
  )
}

function UserDetailPanel({ detail, onClose, onRetry, onViewProof }) {
  const user = detail.user || {}
  const transaction = detail.usage?.transactions
  const payments = detail.payments || []
  const title = user.email || "Pengguna"
  return (
    <>
      <button type="button" aria-label="Tutup detail pengguna" onClick={onClose} className="fixed inset-0 z-40 bg-earth-950/35" />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-earth-100 bg-cream-50 p-4 shadow-warm-xl sm:p-6" role="dialog" aria-modal="true" aria-label={`Detail pengguna ${title}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Detail pengguna</p>
            <h2 id="admin-user-detail-title" className="mt-1 break-all font-display text-2xl font-bold text-earth-900">{title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusPill tone={user.tier === "paid" ? "violet" : "earth"}>{user.tier === "paid" ? "Pro" : "Free"}</StatusPill>
              {user.isAdmin && <StatusPill tone="amber">Admin</StatusPill>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup detail pengguna" className="rounded-full p-2 text-earth-500 transition hover:bg-earth-100 focus:outline-none focus:ring-2 focus:ring-violet-200"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-3xl border border-earth-100 bg-white/90 p-4 shadow-warm" aria-labelledby="admin-user-account-title">
            <h3 id="admin-user-account-title" className="font-bold text-earth-900">Akun</h3>
            {detail.loading.account ? <div className="mt-3"><LoadingText /></div> : detail.errors.account ? <div className="mt-3"><SectionError message={detail.errors.account} onRetry={() => onRetry("account")} /></div> : (
              <div className="mt-2">
                <DetailRow label="Nama" value={user.name || "Tanpa nama"} />
                <DetailRow label="Email" value={user.email} />
                <DetailRow label="Terdaftar" value={formatDateTime(user.created_at)} />
                <DetailRow label="Terakhir aktif" value={formatActivity(user.last_seen_at)} />
                <DetailRow label="Google Sheet" value={user.sheetConnected ? "Terhubung" : "Belum terhubung"} />
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-earth-100 bg-white/90 p-4 shadow-warm" aria-labelledby="admin-user-usage-title">
            <h3 id="admin-user-usage-title" className="font-bold text-earth-900">Penggunaan & kuota</h3>
            <p className="mt-1 text-xs leading-5 text-earth-500">Yang diverifikasi di sini hanya kuota transaksi Supabase. Jumlah budget, goal, utang, Momental, dan tagihan tetap berada di Google Sheet pengguna.</p>
            <div className="mt-3">
              {detail.loading.usage ? <LoadingText /> : detail.errors.usage ? <SectionError message={detail.errors.usage} onRetry={() => onRetry("usage")} /> : transaction?.verified ? (
                <div className="rounded-2xl bg-earth-50 px-4 py-3">
                  <p className="font-bold text-earth-900">{transaction.limit === null ? `${transaction.current} transaksi bulan ini · Tidak terbatas (Pro)` : `${transaction.current} / ${transaction.limit} transaksi bulan ini`}</p>
                  {transaction.resetAt && <p className="mt-1 text-xs text-earth-500">Reset {formatDateTime(transaction.resetAt)}</p>}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Informasi kuota sedang tidak tersedia. Coba lagi untuk memverifikasi ulang.</div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-earth-100 bg-white/90 p-4 shadow-warm" aria-labelledby="admin-user-payment-title">
            <div className="flex items-center justify-between gap-3">
              <h3 id="admin-user-payment-title" className="font-bold text-earth-900">Riwayat pembayaran</h3>
              <a href={`/admin?tab=payments&search=${encodeURIComponent(user.email || "")}`} className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline">Buka pembayaran <ExternalLink size={13} aria-hidden="true" /></a>
            </div>
            <div className="mt-3 space-y-2">
              {detail.loading.payments ? <LoadingText /> : detail.errors.payments ? <SectionError message={detail.errors.payments} onRetry={() => onRetry("payments")} /> : payments.length ? payments.map(payment => (
                <article key={payment.id} className="rounded-2xl border border-earth-100 bg-earth-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-earth-900">{payment.reference}</p>
                      <p className="mt-1 text-xs text-earth-500">{formatRpFull(payment.amount || 0)} · {payment.status || "-"}</p>
                    </div>
                    {payment.hasProof && <button type="button" onClick={() => onViewProof(payment)} className="shrink-0 rounded-xl border border-earth-200 bg-white px-3 py-2 text-xs font-bold text-earth-700 hover:bg-earth-100">Lihat bukti</button>}
                  </div>
                  <p className="mt-2 text-xs text-earth-400">Dibuat {formatDateTime(payment.created_at)}</p>
                </article>
              )) : <p className="text-sm text-earth-500">Belum ada riwayat pembayaran.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-violet-100 bg-violet-50/60 p-4" aria-label="Tautan admin">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Tindakan lanjutan</p>
            <p className="mt-1 text-sm leading-5 text-earth-600">Panel ini read-only. Gunakan halaman terkait untuk tindakan admin.</p>
            <a href={`/admin?tab=features&user=${encodeURIComponent(user.id || "")}`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-violet-700 hover:underline">Buka kontrol fitur <ExternalLink size={14} aria-hidden="true" /></a>
          </section>
        </div>
      </aside>
    </>
  )
}

export default function AdminUsersClient() {
  const [filters, setFilters] = useState({ search: "", tier: "", activity: "", sheet: "", sort: "created_desc" })
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState(null)
  const [proof, setProof] = useState(null)
  const requestSeq = useRef(0)

  const fetchUsers = useCallback(async ({ silent = false } = {}) => {
    const sequence = ++requestSeq.current
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError("")
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort: filters.sort })
    Object.entries(filters).forEach(([key, value]) => { if (key !== "sort" && value) params.set(key, value) })
    try {
      const data = await fetchJson(`/api/admin/users?${params.toString()}`)
      if (sequence !== requestSeq.current) return
      setUsers(Array.isArray(data.users) ? data.users : [])
      setTotal(Number(data.total) || 0)
      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) })
    } catch (err) {
      if (sequence === requestSeq.current) setError(err.message)
    } finally {
      if (sequence === requestSeq.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [filters, page, pageSize])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const setFilter = (key, value) => {
    setPage(1)
    setFilters(current => ({ ...current, [key]: value }))
  }

  const openUser = useCallback((user) => {
    setDetail({ id: user.id, user, usage: null, payments: null, loading: { account: true, usage: true, payments: true }, errors: {} })
    const url = new URL(window.location.href)
    url.searchParams.set("user", user.id)
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    ;["account", "usage", "payments"].forEach(section => {
      fetchJson(`/api/admin/users/${encodeURIComponent(user.id)}?section=${section}`)
        .then(data => setDetail(current => current?.id === user.id ? {
          ...current,
          ...(section === "account" ? { user: data.user || current.user } : { [section]: data[section] }),
          loading: { ...current.loading, [section]: false },
        } : current))
        .catch(err => setDetail(current => current?.id === user.id ? { ...current, loading: { ...current.loading, [section]: false }, errors: { ...current.errors, [section]: err.message } } : current))
    })
  }, [])

  const closeDetail = () => {
    setDetail(null)
    const url = new URL(window.location.href)
    url.searchParams.delete("user")
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
  }

  const retryDetail = (section) => {
    if (!detail?.user) return
    openUserSection(detail.user.id, section)
  }

  const openUserSection = (userId, section) => {
    setDetail(current => current?.id === userId ? { ...current, loading: { ...current.loading, [section]: true }, errors: { ...current.errors, [section]: "" } } : current)
    fetchJson(`/api/admin/users/${encodeURIComponent(userId)}?section=${section}`)
      .then(data => setDetail(current => current?.id === userId ? {
        ...current,
        ...(section === "account" ? { user: data.user || current.user } : { [section]: data[section] }),
        loading: { ...current.loading, [section]: false },
      } : current))
      .catch(err => setDetail(current => current?.id === userId ? { ...current, loading: { ...current.loading, [section]: false }, errors: { ...current.errors, [section]: err.message } } : current))
  }

  const viewProof = async (payment) => {
    setProof({ payment, url: "", loading: true, error: "" })
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}/proof`)
      if (!response.ok) throw new Error("Bukti tidak dapat dibuka.")
      const blob = await response.blob()
      if (!blob.type.startsWith("image/")) throw new Error("Format bukti tidak valid.")
      setProof(current => ({ ...current, url: URL.createObjectURL(blob), loading: false }))
    } catch (err) {
      setProof(current => ({ ...current, loading: false, error: err.message }))
    }
  }

  const closeProof = () => {
    if (proof?.url) URL.revokeObjectURL(proof.url)
    setProof(null)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const visibleRange = total ? `${(page - 1) * pageSize + 1}-${Math.min(total, page * pageSize)}` : "0"
  const hasUsers = users.length > 0
  const activeUserId = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("user")
  useEffect(() => {
    if (!detail && activeUserId) {
      const user = users.find(item => item.id === activeUserId)
      if (user) openUser(user)
    }
  }, [activeUserId, detail, openUser, users])

  return (
    <main className="min-h-screen px-4 py-6 text-earth-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-3xl border border-earth-100 bg-white/85 p-5 shadow-warm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">User directory</p>
              <h2 className="font-display text-3xl font-bold text-earth-900">Pengguna Artami</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-earth-500">Lihat siapa yang memakai aplikasi, status Sheet, aktivitas terakhir, kuota transaksi, dan riwayat pembayaran tanpa mengubah akun pengguna.</p>
            </div>
            <button type="button" onClick={() => fetchUsers({ silent: true })} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-earth-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-earth-800 disabled:cursor-not-allowed disabled:opacity-50">
              {refreshing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
              Segarkan pengguna
            </button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Ringkasan pengguna">
          <SummaryCard label="Total" value={`${summary.total} pengguna`} />
          <SummaryCard label="Free" value={summary.free} />
          <SummaryCard label="Pro" value={summary.paid} tone="violet" />
          <SummaryCard label="Aktif 7 hari" value={summary.active7d} tone="moss" />
          <SummaryCard label="Sheet terhubung" value={summary.sheetConnected} tone="moss" />
        </section>

        <form onSubmit={event => { event.preventDefault(); setPage(1); setFilters(current => ({ ...current, search: searchInput })) }} className="grid gap-3 rounded-3xl border border-earth-100 bg-white/85 p-4 shadow-warm md:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="text-xs font-bold text-earth-500 lg:col-span-2">Cari nama atau email
            <input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="contoh@email.com" className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold text-earth-800 outline-none focus:ring-2 focus:ring-violet-200" />
          </label>
          <label className="text-xs font-bold text-earth-500">Tier
            <select value={filters.tier} onChange={event => setFilter("tier", event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold text-earth-800"><option value="">Semua</option><option value="free">Free</option><option value="paid">Pro</option></select>
          </label>
          <label className="text-xs font-bold text-earth-500">Aktivitas
            <select value={filters.activity} onChange={event => setFilter("activity", event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold text-earth-800"><option value="">Semua</option><option value="24h">24 jam</option><option value="7d">7 hari</option><option value="30d">30 hari</option><option value="never">Belum aktif</option></select>
          </label>
          <label className="text-xs font-bold text-earth-500">Sheet
            <select value={filters.sheet} onChange={event => setFilter("sheet", event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold text-earth-800"><option value="">Semua</option><option value="connected">Terhubung</option><option value="not_connected">Belum terhubung</option></select>
          </label>
          <div className="flex gap-2 md:col-span-2 lg:col-span-5">
            <label className="flex-1 text-xs font-bold text-earth-500">Urutkan
              <select value={filters.sort} onChange={event => setFilter("sort", event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold text-earth-800"><option value="created_desc">Terbaru mendaftar</option><option value="created_asc">Terlama mendaftar</option><option value="last_seen_desc">Terakhir aktif</option><option value="last_seen_asc">Paling lama aktif</option></select>
            </label>
            <button type="submit" className="self-end rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Terapkan</button>
          </div>
        </form>

        {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">{error}</div>}

        <section aria-label="Daftar pengguna" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-earth-500"><p>{loading ? "Memuat pengguna..." : hasUsers ? `${visibleRange} dari ${total} pengguna` : "Tidak ada pengguna"}</p><p className="font-semibold">Refresh hanya membaca data; aktivitas dicatat saat user memakai Artami.</p></div>
          {loading ? <div className="rounded-3xl border border-earth-100 bg-white/70 p-8 text-center shadow-warm"><LoadingText label="Memuat daftar pengguna..." /></div> : hasUsers ? users.map(user => (
            <article key={user.id} className="rounded-3xl border border-earth-100 bg-white/90 p-4 shadow-warm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="break-all font-bold text-earth-900">{user.name || "Tanpa nama"}</h3><StatusPill tone={user.tier === "paid" ? "violet" : "earth"}>{user.tier === "paid" ? "Pro" : "Free"}</StatusPill>{user.isAdmin && <StatusPill tone="amber">Admin</StatusPill>}</div>
                  <p className="mt-1 break-all text-sm font-semibold text-earth-600">{user.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><StatusPill tone={user.sheetConnected ? "moss" : "earth"}>{user.sheetConnected ? "Terhubung" : "Belum terhubung"}</StatusPill><span className="text-earth-400">Terakhir aktif: {formatActivity(user.last_seen_at)}</span><span className="text-earth-400">Terdaftar: {formatDate(user.created_at)}</span></div>
                </div>
                <button type="button" onClick={() => openUser(user)} className="shrink-0 rounded-2xl border border-earth-200 bg-white px-4 py-2.5 text-sm font-bold text-earth-700 transition hover:bg-earth-50 focus:outline-none focus:ring-2 focus:ring-violet-200" aria-label={`Lihat detail ${user.name || user.email}`}>Lihat detail</button>
              </div>
            </article>
          )) : <div className="rounded-3xl border border-earth-100 bg-white/85 px-5 py-12 text-center shadow-warm"><p className="font-display text-2xl font-bold text-earth-900">Belum ada hasil</p><p className="mt-1 text-sm text-earth-500">Coba ubah pencarian atau filter pengguna.</p></div>}
        </section>

        <nav className="flex flex-col gap-3 rounded-3xl border border-earth-100 bg-white/85 p-4 shadow-warm sm:flex-row sm:items-center sm:justify-between" aria-label="Paginasi pengguna">
          <label className="text-sm font-bold text-earth-600">Per halaman
            <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }} className="ml-2 rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select>
          </label>
          <div className="flex items-center gap-2"><span className="text-sm font-bold text-earth-600">Halaman {page} dari {totalPages}</span><button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">Sebelumnya</button><button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} className="rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">Berikutnya</button></div>
        </nav>
      </div>

      {detail && <UserDetailPanel detail={detail} onClose={closeDetail} onRetry={retryDetail} onViewProof={viewProof} />}
      {proof && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-earth-950/60 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="admin-user-proof-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white p-5 shadow-warm-xl">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-earth-400">Bukti pembayaran</p><h2 id="admin-user-proof-title" className="font-display text-2xl font-bold text-earth-900">{proof.payment.reference}</h2></div><button type="button" onClick={closeProof} aria-label="Tutup bukti pembayaran" className="rounded-full p-2 text-earth-500 hover:bg-earth-50"><X size={18} aria-hidden="true" /></button></div>
            <div className="mt-4 flex min-h-64 flex-1 items-center justify-center overflow-auto rounded-2xl bg-earth-50 p-3">{proof.loading && <LoadingText label="Memuat bukti..." />}{proof.error && <p role="alert" className="text-sm font-semibold text-rose-600">{proof.error}</p>}{proof.url && !proof.loading && !proof.error && <img src={proof.url} alt={`Bukti pembayaran ${proof.payment.reference}`} className="max-h-[65vh] max-w-full object-contain" />}</div>
          </section>
        </div>
      )}
    </main>
  )
}
