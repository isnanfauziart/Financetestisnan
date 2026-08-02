"use client"

import { useCallback, useEffect, useState } from "react"
import Toast from "@/app/dashboard/_components/Toast"
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

export default function AdminShell() {
  const [tab, setTab] = useState(readTab)
  const [toast, setToast] = useState("")

  useEffect(() => {
    const handlePopState = () => setTab(readTab())
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const selectTab = (nextTab) => {
    setTab(nextTab)
    writeTab(nextTab)
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
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => selectTab(item.id)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-violet-200 ${tab === item.id ? "bg-white text-earth-900 shadow-sm" : "text-earth-500 hover:text-earth-800"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {tab === "payments" && <AdminPaymentsClient />}
      {tab === "users" && <AdminUsersClient />}
      {tab === "features" && (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AdminFeatureControls onSuccess={notifySuccess} />
        </div>
      )}

      <Toast open={Boolean(toast)} onDone={dismissToast} variant="success" align="right" duration={5000}>
        {toast}
      </Toast>
    </div>
  )
}
