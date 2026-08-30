"use client"

import { useEffect, useMemo, useState } from "react"

const LABELS = {
  transactions: "Transaksi",
  budgets: "Budget",
  goals: "Goals",
  debts: "Utang & Piutang",
  momental: "Momental",
  bills: "Tagihan",
  insights: "Insights",
  healthScore: "Health Score",
  cashFlowForecast: "Cash Flow Forecast",
  anomalyAlerts: "Anomaly Alerts",
  financialIndependence: "Financial Independence",
  whatIf: "What-If",
  yearInReview: "Year in Review",
  recurringExpenseRadar: "Recurring Expense Radar",
  pdfReports: "Laporan PDF",
  paymentQris: "Pembayaran QRIS",
  authentication: "Autentikasi",
  dataIntegrity: "Integritas data",
}

function labelFor(key) {
  return LABELS[key] || key
}

function formatWib(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date) + " WIB"
}

function toIso(localValue) {
  const date = new Date(`${localValue}:00+07:00`)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString()
}

async function jsonResponse(response, fallback) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || data.message || fallback)
  return data
}

export default function AdminFeatureControls({ onSuccess }) {
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [scheduleDrafts, setScheduleDrafts] = useState({})
  const [targetFeature, setTargetFeature] = useState("")
  const [targetEnabled, setTargetEnabled] = useState("")
  const [targetScheduleAt, setTargetScheduleAt] = useState("")
  const [targetScheduleEnabled, setTargetScheduleEnabled] = useState("false")
  const [search, setSearch] = useState("")
  const [tier, setTier] = useState("")
  const [minAgeDays, setMinAgeDays] = useState("")
  const [maxAgeDays, setMaxAgeDays] = useState("")
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const controllableFeatures = useMemo(() => features.filter(feature => !feature.protected), [features])

  useEffect(() => {
    let active = true
    fetch("/api/admin/features")
      .then(response => jsonResponse(response, "Gagal mengambil kontrol fitur."))
      .then(data => {
        if (!active) return
        setFeatures(Array.isArray(data.features) ? data.features : [])
        if (!targetFeature && data.features?.length) {
          const first = data.features.find(feature => !feature.protected)
          setTargetFeature(first?.key || "")
        }
      })
      .catch(err => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const postFeature = async (payload, key, successMessage) => {
    setBusy(key)
    setError("")
    setNotice("")
    try {
      const data = await jsonResponse(await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }), "Gagal memperbarui fitur.")
      setNotice(successMessage)
      onSuccess?.(successMessage)
      return data
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusy("")
    }
  }

  const toggleGlobal = async (feature) => {
    const enabled = !feature.enabled
    if (!enabled && !window.confirm(`Nonaktifkan ${labelFor(feature.key)} untuk semua pengguna? Data pengguna tetap aman dan fitur bisa diaktifkan lagi.`)) return
    const ok = await postFeature({ feature: feature.key, scope: "global", enabled }, `global-${feature.key}`, `${labelFor(feature.key)} ${enabled ? "diaktifkan" : "dinonaktifkan"}.`)
    if (ok) {
      setFeatures(current => current.map(item => item.key === feature.key ? {
        ...item,
        enabled,
        scheduledAt: null,
        scheduledEnabled: null,
        updatedAt: ok.updatedAt || new Date().toISOString(),
        updatedBy: ok.updatedBy || item.updatedBy,
      } : item))
      setScheduleDrafts(current => ({ ...current, [feature.key]: { ...(current[feature.key] || {}), enabled } }))
    }
  }

  const scheduleGlobal = async (feature) => {
    const draft = scheduleDrafts[feature.key] || {}
    const scheduledAt = toIso(draft.at)
    if (!scheduledAt) return setError("Pilih waktu jadwal yang valid.")
    const scheduledEnabled = draft.enabled !== false
    if (!scheduledEnabled && !window.confirm(`Jadwalkan ${labelFor(feature.key)} menjadi nonaktif?`)) return
    const ok = await postFeature({
      feature: feature.key,
      scope: "global",
      enabled: feature.enabled,
      scheduledAt,
      scheduledEnabled,
    }, `schedule-${feature.key}`, `Perubahan ${labelFor(feature.key)} dijadwalkan.`)
    if (ok) setFeatures(current => current.map(item => item.key === feature.key ? {
      ...item,
      scheduledAt,
      scheduledEnabled,
      updatedAt: ok.updatedAt || new Date().toISOString(),
      updatedBy: ok.updatedBy || item.updatedBy,
    } : item))
  }

  const findUsers = async (event) => {
    event?.preventDefault()
    setUsersLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (tier) params.set("tier", tier)
      if (minAgeDays) params.set("minAgeDays", minAgeDays)
      if (maxAgeDays) params.set("maxAgeDays", maxAgeDays)
      const data = await jsonResponse(await fetch(`/api/admin/users?${params.toString()}`), "Gagal mencari pengguna.")
      setUsers(Array.isArray(data.users) ? data.users : [])
      setSelectedUsers([])
    } catch (err) {
      setError(err.message)
    } finally {
      setUsersLoading(false)
    }
  }

  const applyUsers = async () => {
    if (!targetFeature || !selectedUsers.length) return setError("Pilih minimal satu pengguna.")
    const disabling = targetEnabled === "false" || (targetScheduleAt && targetScheduleEnabled === "false")
    if (disabling && !window.confirm(`Terapkan fitur ${labelFor(targetFeature)} menjadi nonaktif untuk ${selectedUsers.length} pengguna?`)) return
    const payload = {
      feature: targetFeature,
      scope: "users",
      enabled: targetEnabled === "" ? null : targetEnabled === "true",
      userIds: selectedUsers,
    }
    if (targetScheduleAt) {
      payload.scheduledAt = toIso(targetScheduleAt)
      payload.scheduledEnabled = targetScheduleEnabled === "true"
    }
    const ok = await postFeature(payload, "users", `Pengaturan ${labelFor(targetFeature)} diterapkan ke pengguna terpilih.`)
    if (ok) setSelectedUsers([])
  }

  const toggleUser = (id) => setSelectedUsers(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])

  return (
    <section className="rounded-3xl border border-earth-100 bg-white/80 p-5 shadow-warm" aria-labelledby="feature-controls-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Admin switchboard</p>
          <h2 id="feature-controls-title" className="font-display text-2xl font-bold text-earth-900">Kontrol fitur</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-earth-500">Atur default global, jadwalkan perubahan satu kali, atau pilih pengguna tertentu. Pengguna tanpa override mengikuti pengaturan global.</p>
        </div>
        {loading && <span className="text-sm font-semibold text-earth-400">Memuat...</span>}
      </div>

      {error && <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
      {notice && <p className="mt-4 rounded-2xl border border-moss-100 bg-moss-50 px-4 py-3 text-sm font-semibold text-moss-700" role="status">{notice}</p>}

      <div className="mt-5 grid gap-3">
        {features.map(feature => {
          const draft = scheduleDrafts[feature.key] || { at: "", enabled: feature.enabled }
          return (
            <article key={feature.key} className="rounded-2xl border border-earth-100 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-earth-900">{labelFor(feature.key)}</h3>
                    {feature.protected && <span className="rounded-full bg-earth-100 px-2 py-1 text-[10px] font-bold uppercase text-earth-500">Dilindungi</span>}
                    {feature.paidOnly && <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase text-violet-600">Pro</span>}
                  </div>
                  <p className="mt-1 text-xs text-earth-500">{feature.description}</p>
                  {!feature.protected && <p className="mt-1 text-xs font-semibold text-earth-400">Override pengguna: {feature.overrideCount || 0}</p>}
                  {feature.updatedAt && <p className="mt-1 text-xs text-earth-400">Terakhir diubah {formatWib(feature.updatedAt)}{feature.updatedBy ? ` oleh ${feature.updatedBy}` : ""}</p>}
                  {feature.scheduledAt && <p className="mt-2 text-xs font-semibold text-amber-700">Jadwal: {feature.scheduledEnabled ? "Aktif" : "Nonaktif"} pada {formatWib(feature.scheduledAt)}</p>}
                </div>
                <button
                  type="button"
                  disabled={feature.protected || busy === `global-${feature.key}`}
                  onClick={() => toggleGlobal(feature)}
                  aria-label={`${feature.enabled ? "Nonaktifkan" : "Aktifkan"} ${labelFor(feature.key)}`}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${feature.enabled ? "bg-moss-600 hover:bg-moss-700" : "bg-earth-400 hover:bg-earth-500"}`}
                >
                  {busy === `global-${feature.key}` ? "Menyimpan..." : feature.enabled ? "Aktif" : "Nonaktif"}
                </button>
              </div>
              {!feature.protected && (
                <div className="mt-4 grid gap-2 border-t border-earth-100 pt-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <label className="text-xs font-bold text-earth-500">
                    Jadwalkan (WIB)
                    <input
                      type="datetime-local"
                      value={draft.at || ""}
                      onChange={event => setScheduleDrafts(current => ({ ...current, [feature.key]: { ...draft, at: event.target.value } }))}
                      className="mt-1 block w-full rounded-xl border border-earth-100 px-3 py-2 text-sm font-semibold text-earth-800"
                    />
                  </label>
                  <label className="text-xs font-bold text-earth-500">Status
                    <select
                      value={draft.enabled ? "true" : "false"}
                      onChange={event => setScheduleDrafts(current => ({ ...current, [feature.key]: { ...draft, enabled: event.target.value === "true" } }))}
                      className="mt-1 block rounded-xl border border-earth-100 px-3 py-2 text-sm font-semibold text-earth-800"
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </select>
                  </label>
                  <button type="button" onClick={() => scheduleGlobal(feature)} disabled={busy === `schedule-${feature.key}`} className="rounded-xl border border-earth-200 px-3 py-2 text-sm font-bold text-earth-700 hover:bg-earth-50 disabled:opacity-50">{busy === `schedule-${feature.key}` ? "Menyimpan..." : "Simpan jadwal"}</button>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <h3 className="font-bold text-earth-900">Override pengguna</h3>
        <p className="mt-1 text-xs leading-5 text-earth-500">Filter memakai data akun yang sudah ada: email/nama, tier, dan usia akun. Pengaturan ini hanya diterapkan ke pengguna yang dicentang sekarang.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-bold text-earth-500">Fitur
            <select value={targetFeature} onChange={event => setTargetFeature(event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm font-semibold text-earth-800" aria-label="Fitur target pengguna">
              {controllableFeatures.map(feature => <option key={feature.key} value={feature.key}>{labelFor(feature.key)}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-earth-500">Cari email/nama
            <input value={search} onChange={event => setSearch(event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm" placeholder="contoh@email.com" />
          </label>
          <label className="text-xs font-bold text-earth-500">Tier
            <select value={tier} onChange={event => setTier(event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm" aria-label="Filter berdasarkan tier"><option value="">Semua</option><option value="free">Free</option><option value="paid">Pro</option></select>
          </label>
          <label className="text-xs font-bold text-earth-500">Usia akun minimum (hari)
            <input type="number" min="0" value={minAgeDays} onChange={event => setMinAgeDays(event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm" aria-label="Usia akun minimum (hari)" />
          </label>
          <label className="text-xs font-bold text-earth-500">Usia akun maksimum (hari)
            <input type="number" min="0" value={maxAgeDays} onChange={event => setMaxAgeDays(event.target.value)} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm" aria-label="Usia akun maksimum (hari)" />
          </label>
        </div>
        <form onSubmit={findUsers} className="mt-3"><button type="submit" disabled={usersLoading} className="rounded-xl bg-earth-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{usersLoading ? "Mencari..." : "Cari pengguna"}</button></form>

        {users.length > 0 && <div className="mt-4 rounded-xl border border-earth-100 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-earth-800">{selectedUsers.length} dipilih dari {users.length}</p><button type="button" onClick={() => setSelectedUsers(selectedUsers.length === users.length ? [] : users.map(user => user.id))} className="text-xs font-bold text-violet-600">{selectedUsers.length === users.length ? "Batalkan semua" : "Pilih semua"}</button></div>
          <div className="mt-2 grid max-h-56 gap-2 overflow-auto sm:grid-cols-2">
            {users.map(user => <label key={user.id} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-earth-50"><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleUser(user.id)} className="mt-1" /><span><strong className="block text-earth-800">{user.name || "Tanpa nama"}</strong><span className="text-xs text-earth-500">{user.email} · {user.tier || "free"}</span></span></label>)}
          </div>
        </div>}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="text-xs font-bold text-earth-500">Override
            <select value={targetEnabled} onChange={event => { setTargetEnabled(event.target.value); if (!event.target.value) setTargetScheduleAt("") }} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm" aria-label="Override fitur pengguna"><option value="">Gunakan global</option><option value="true">Aktifkan</option><option value="false">Nonaktifkan</option></select>
          </label>
          <label className="text-xs font-bold text-earth-500">Jadwal (opsional)
            <input type="datetime-local" value={targetScheduleAt} onChange={event => setTargetScheduleAt(event.target.value)} disabled={!targetEnabled} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm disabled:opacity-50" />
          </label>
          <label className="text-xs font-bold text-earth-500">Status jadwal
            <select value={targetScheduleEnabled} onChange={event => setTargetScheduleEnabled(event.target.value)} disabled={!targetScheduleAt} className="mt-1 block w-full rounded-xl border border-earth-100 bg-white px-3 py-2 text-sm disabled:opacity-50" aria-label="Status jadwal pengguna"><option value="true">Aktif</option><option value="false">Nonaktif</option></select>
          </label>
          <button type="button" onClick={applyUsers} disabled={busy === "users" || !selectedUsers.length} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy === "users" ? "Menyimpan..." : "Terapkan ke pilihan"}</button>
        </div>
      </div>
    </section>
  )
}
