"use client"

import { useCallback, useEffect, useState } from "react"
import Toast from "@/app/dashboard/_components/Toast"
import { formatRpFull } from "@/app/dashboard/_components/helpers"
import AdminFeatureControls from "./AdminFeatureControls"
import AdminPaymentsClient from "./AdminPaymentsClient"
import AdminUsersClient from "./AdminUsersClient"

const TABS = [
  { id: "payments", label: "Pembayaran" },
  { id: "users", label: "Pengguna" },
  { id: "features", label: "Kontrol Fitur" },
]

function readTab() {
  if (typeof window === "undefined") return "payments"
  const value = new URL(window.location.href).searchParams.get("tab")
  return TABS.some(tab => tab.id === value) ? value : "payments"
}

function writeTab(tab) {
  const url = new URL(window.location.href)
  if (tab === "payments") url.searchParams.delete("tab")
  else url.searchParams.set("tab", tab)
  window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`)
}

function OverviewStat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-earth-100 bg-white/85 px-4 py-3 shadow-warm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-earth-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-earth-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs font-semibold text-earth-500">{sub}</p>}
    </div>
  )
}

export default function AdminShell() {
  const [tab, setTab] = useState(readTab)
  const [toast, setToast] = useState("")
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    const handlePopState = () => setTab(readTab())
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const loadOverview = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/overview")
      if (!response.ok) return
      setOverview(await response.json())
    } catch {
      // The overview is a convenience summary; the tabs keep working without it.
    }
  }, [])

  useEffect(() => {
    loadOverview()
    const timer = window.setInterval(loadOverview, 30000)
    return () => window.clearInterval(timer)
  }, [loadOverview])

  const selectTab = (nextTab) => {
    setTab(nextTab)
    writeTab(nextTab)
    loadOverview()
  }

  const handleTabKeyDown = (event) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const index = TABS.findIndex(item => item.id === tab)
    let nextIndex = index
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TABS.length
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + TABS.length) % TABS.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = TABS.length - 1
    const nextTab = TABS[nextIndex].id
    selectTab(nextTab)
    document.getElementById(`admin-tab-${nextTab}`)?.focus()
  }

  const notifySuccess = useCallback((message) => setToast(message), [])
  const dismissToast = useCallback(() => setToast(""), [])

  return (
    <div className="min-h-screen bg-cream-50 text-earth-900">
      <header className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-earth-100 bg-white/90 p-5 shadow-warm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Artami Admin</p>
          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-earth-900">Admin workspace</h1>
              <p className="mt-1 text-sm text-earth-500">Kelola pembayaran, pahami pengguna, dan kendalikan peluncuran fitur.</p>
            </div>
            <nav className="flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-earth-50 p-1" aria-label="Bagian admin" role="tablist">
              {TABS.map(item => (
                <button
                  key={item.id}
                  id={`admin-tab-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  aria-controls="admin-panel"
                  tabIndex={tab === item.id ? 0 : -1}
                  onClick={() => selectTab(item.id)}
                  onKeyDown={handleTabKeyDown}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-violet-200 ${tab === item.id ? "bg-white text-earth-900 shadow-sm" : "text-earth-500 hover:text-earth-800"}`}
                >
                  {item.label}
                  {item.id === "payments" && overview?.pendingCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{overview.pendingCount}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {overview && (
          <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan admin">
            <OverviewStat label="Menunggu review" value={overview.pendingCount} sub="pembayaran" />
            <OverviewStat label="Nilai menunggu" value={formatRpFull(overview.pendingAmount || 0)} sub="belum diverifikasi" />
            <OverviewStat label="Pengguna Pro" value={overview.paidUsers} sub={`dari ${overview.totalUsers} pengguna`} />
            <OverviewStat label="Pendapatan disetujui" value={formatRpFull(overview.approvedRevenue || 0)} sub={`${overview.approvedCount} pembayaran`} />
          </section>
        )}
      </header>

      <main>
        <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
          {tab === "payments" && <AdminPaymentsClient />}
          {tab === "users" && <AdminUsersClient />}
          {tab === "features" && (
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <AdminFeatureControls onSuccess={notifySuccess} />
            </div>
          )}
        </div>
      </main>

      <Toast open={Boolean(toast)} onDone={dismissToast} variant="success" align="right" duration={5000}>
        {toast}
      </Toast>
    </div>
  )
}
