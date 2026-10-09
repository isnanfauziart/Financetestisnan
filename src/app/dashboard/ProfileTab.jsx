"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { LogOut, Wallet, Calendar } from "lucide-react"
import { THEME, AVAILABLE_MONTHS } from "./_components/constants"
import { formatRpFull, formatInputRupiah } from "./_components/helpers"
import { useSettings } from "@/lib/useSharedData"
import Sheet from "./_components/Sheet"
import SegmentedButtons from "./_components/SegmentedButtons"
import CategoryManager from "@/components/CategoryManager"
import DocsSection from "@/components/DocsSection"
import UserNameSetup from "@/components/UserNameSetup"
import BalanceCheckpointCard from "@/components/BalanceCheckpointCard"
import SheetsHubCard from "@/components/SheetsHubCard"
import UserAvatar from "@/components/UserAvatar"
import { isProRegistrationOpen } from "@/lib/featureAccess"

const THEME_OPTIONS = ["Terang", "Gelap", "Sistem"]
const THEME_MODE_BY_LABEL = { Terang: "light", Gelap: "dark", Sistem: "system" }
const THEME_LABEL_BY_MODE = { light: "Terang", dark: "Gelap", system: "Sistem" }

function applyTheme(mode) {
  const root = document.documentElement
  const dark =
    mode === "dark" ||
    (mode === "system" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  if (dark) root.setAttribute("data-theme", "dark")
  else root.removeAttribute("data-theme")
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—"
  const parts = dateStr.split("-")
  if (parts.length !== 3) return dateStr
  const monthIdx = parseInt(parts[1], 10) - 1
  const monthName = AVAILABLE_MONTHS[monthIdx] || parts[1]
  return `${parseInt(parts[2], 10)} ${monthName} ${parts[0]}`
}

function formatTierLabel(tier) {
  const normalized = String(tier || "free").trim().toLowerCase()
  if (normalized === "paid" || normalized === "premium" || normalized === "lifetime") return "Pro"
  return "Free"
}

const QUOTA_LABELS = {
  transactions: "Transaksi bulan ini",
  budgets: "Anggaran bulan ini",
  goals: "Target",
  debts: "Utang & piutang",
  momental: "Event budget",
  bills: "Tagihan",
  insights: "Insight minggu ini",
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-md3-on-surface-variant mb-1">{children}</h3>
  )
}

export default function ProfileTab({ userName, session, data, entitlement, signOut, soundEnabled, setSoundEnabled, hapticsEnabled, setHapticsEnabled, onToast, onRefresh, lastSyncAt, isOnline, refreshing }) {
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [themeMode, setThemeMode] = useState("light")
  const themeHydratedRef = useRef(false)
  const { settings, refetch: refetchSettings } = useSettings()

  // Hydrate persisted choice (default Sistem when unset), then keep data-theme
  // in sync; while in Sistem mode, follow the OS scheme and clean up on unmount.
  useEffect(() => {
    let stored = null
    try {
      stored = localStorage.getItem("artami-theme")
    } catch {}
    themeHydratedRef.current = true
    setThemeMode(stored === "dark" || stored === "light" ? stored : "system")
  }, [])

  useEffect(() => {
    if (!themeHydratedRef.current) return
    applyTheme(themeMode)
    try {
      localStorage.setItem("artami-theme", themeMode)
    } catch {}
    if (themeMode !== "system" || typeof window.matchMedia !== "function") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onSchemeChange = () => applyTheme("system")
    media.addEventListener("change", onSchemeChange)
    return () => media.removeEventListener("change", onSchemeChange)
  }, [themeMode])

  const [editingSaldo, setEditingSaldo] = useState(false)
  const [rawSaldo, setRawSaldo] = useState("")
  const [editDate, setEditDate] = useState("")
  const [savingSaldo, setSavingSaldo] = useState(false)
  const tierLabel = formatTierLabel(entitlement?.tier || data?.tier)
  const proRegistrationOpen = isProRegistrationOpen(entitlement)
  const quotaEntries = Object.entries(entitlement?.usage || {})
  const displayName = userName || session?.user?.name || ""

  const handleStartEdit = () => {
    setRawSaldo(formatInputRupiah(String(settings.startingBalance)))
    setEditDate(settings.startingBalanceDate || new Date().toISOString().split("T")[0])
    setEditingSaldo(true)
  }

  const handleSaveSaldo = async () => {
    const amount = parseFloat(String(rawSaldo).replace(/\./g, ""))
    if (!amount || amount < 0) {
      onToast("Masukkan jumlah yang valid", "error")
      return
    }
    if (!editDate) {
      onToast("Masukkan tanggal", "error")
      return
    }

    setSavingSaldo(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            ["startingBalance", amount],
            ["startingBalanceDate", editDate],
          ],
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan")
      await refetchSettings()
      if (onRefresh) onRefresh()
      setEditingSaldo(false)
      onToast("Saldo awal diperbarui ✓")
    } catch (err) {
      onToast(err.message, "error")
    }
    setSavingSaldo(false)
  }

  return (
    <div className="px-5 pt-2 animate-bento-in space-y-8" key="profile-tab">
      <div className="flex items-center gap-4">
        <UserAvatar src={session?.user?.image} name={displayName} email={session?.user?.email} className="w-16 h-16 rounded-[22px]" />
        <div className="min-w-0">
          <h2 className="text-xl font-display font-bold text-md3-on-surface truncate">{displayName}</h2>
          <p className="text-xs font-medium text-md3-on-surface-variant truncate">{session?.user?.email}</p>
          <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${tierLabel === "Pro" ? "bg-violet-100 text-violet-700" : "bg-[var(--surface-warm)] text-md3-on-surface-variant"}`}>{tierLabel}</span>
        </div>
      </div>

      <section aria-label="Akun">
        <SectionTitle>Akun</SectionTitle>
        <div className="divide-y divide-[var(--border)]">
          <div className="py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-md3-on-surface-variant">Nama pengguna</span>
              <button
                type="button"
                onClick={() => setEditingName((v) => !v)}
                className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700"
              >
                {editingName ? "Batal" : "Ubah"}
              </button>
            </div>
            {editingName ? (
              <UserNameSetup
                initialValue={settings.userName || displayName}
                open={editingName}
                mode="settings"
                onSaved={() => { setEditingName(false); refetchSettings() }}
              />
            ) : (
              <p className="mt-1 text-sm font-bold text-md3-on-surface">{settings.userName || displayName || "—"}</p>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm font-medium text-md3-on-surface-variant">Email</span>
            <span className="text-sm font-bold text-md3-on-surface truncate max-w-[60%] text-right">{session?.user?.email || "—"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm font-medium text-md3-on-surface-variant">Total transaksi</span>
            <span className="text-sm font-bold tabular-nums text-md3-on-surface">{data?.transactions?.length || 0}</span>
          </div>
        </div>
      </section>

      <section aria-label="Data milikmu">
        <div className="rounded-[28px] p-5 text-white" style={{ backgroundColor: THEME.heroBg }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Data milikmu</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed">Catatan keuanganmu tetap berada di Google Sheets milikmu.</p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">Artami tidak menghubungkan rekening bank. Tidak ada iklan.</p>
        </div>
      </section>

      <section aria-label="Paket dan pemakaian">
        <SectionTitle>Paket & pemakaian</SectionTitle>
        <div className="divide-y divide-[var(--border)]">
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm font-medium text-md3-on-surface-variant">Paket</span>
            <span className="text-sm font-bold text-md3-on-surface">{tierLabel === "Pro" ? "Pro · seumur hidup" : "Free"}</span>
          </div>
          {quotaEntries.length > 0 && quotaEntries.map(([feature, item]) => {
            const pct = item.limit ? Math.min(100, Math.round(((Number(item.current) || 0) / item.limit) * 100)) : 0
            const urgent = item.warning === "reached" || item.warning === "near"
            return (
              <div key={feature} className="py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-md3-on-surface-variant">{QUOTA_LABELS[feature] || feature}</span>
                  <span className={`font-bold tabular-nums ${urgent ? "text-[var(--danger)]" : "text-md3-on-surface"}`}>
                    {item.limit === null ? "Tanpa batas" : item.current === null ? `— / ${item.limit}` : `${item.current} / ${item.limit}`}
                  </span>
                </div>
                {item.limit !== null && item.current !== null && (
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-warm)]" role="img" aria-label={`${QUOTA_LABELS[feature] || feature}: ${item.current} dari ${item.limit}`}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: urgent ? "var(--danger)" : "var(--income)" }} />
                  </div>
                )}
                {item.warning === "near" && <p className="mt-1 text-[11px] font-semibold text-[var(--warning)]" role="status">Hampir mencapai batas</p>}
                {item.warning === "reached" && <p className="mt-1 text-[11px] font-semibold text-[var(--danger)]" role="alert">Batas sudah terpakai</p>}
              </div>
            )
          })}
        </div>
        {(data?.history?.limited || entitlement?.history?.months === 4) && (
          <p className="mt-1 text-xs leading-relaxed text-md3-on-surface-variant">
            Data lama tetap aman dan bisa kamu buka di Google Sheets.
          </p>
        )}
        {tierLabel === "Pro" ? (
          <p className="mt-3 text-xs leading-relaxed text-md3-on-surface-variant">
            Kamu memakai Artami Pro seumur hidup — transaksi dan riwayat tanpa batas, semua fitur pintar terbuka. Terima kasih!
          </p>
        ) : (
          <Link
            href="/upgrade"
            className="mt-3 block w-full rounded-full bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-violet-700"
          >
            {proRegistrationOpen ? "Upgrade ke Pro · Rp40.000 sekali bayar" : "Pro sementara ditutup"}
          </Link>
        )}
      </section>

      <section aria-label="Pengaturan">
        <SectionTitle>Pengaturan</SectionTitle>
        <div className="divide-y divide-[var(--border)]">
          <div className="py-3">
            <p className="text-sm font-medium text-md3-on-surface">Tema</p>
            <p className="mt-0.5 mb-2 text-xs leading-relaxed text-md3-on-surface-variant">Tampilan terang, gelap, atau ikuti pengaturan sistem.</p>
            <SegmentedButtons
              options={THEME_OPTIONS}
              value={THEME_LABEL_BY_MODE[themeMode]}
              onChange={(label) => setThemeMode(THEME_MODE_BY_LABEL[label])}
              ariaLabel="Pilih tema tampilan"
            />
          </div>
          <div className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-md3-on-surface">Kategori</p>
              <p className="mt-0.5 text-xs leading-relaxed text-md3-on-surface-variant">Sesuaikan kategori pengeluaran, pemasukan, dan tabunganmu.</p>
            </div>
            <button type="button" onClick={() => setShowCategoryManager(true)} className="min-h-11 min-w-11 rounded-xl bg-sage-100 px-3 py-2 text-xs font-bold text-sage-700 hover:bg-sage-200 transition-colors">Atur</button>
          </div>
          <div className="py-3">
            {editingSaldo ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-md3-on-surface">Saldo awal</span>
                  <button onClick={() => setEditingSaldo(false)} className="text-xs font-semibold text-md3-on-surface-variant">Batal</button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={String(settings.startingBalance)}
                    value={rawSaldo}
                    onChange={e => setRawSaldo(formatInputRupiah(e.target.value))}
                    className="field-outlined flex-1 px-3 py-2 text-sm font-semibold"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-md3-on-surface-variant uppercase tracking-wider block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="field-outlined w-full px-3 py-2 text-sm font-semibold"
                  />
                </div>
                <button
                  onClick={handleSaveSaldo}
                  disabled={savingSaldo}
                  className="w-full min-h-11 py-2.5 rounded-xl text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
                  style={{ background: savingSaldo ? "#ccc" : THEME.primary }}
                >
                  {savingSaldo ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-md3-on-surface-variant">Saldo awal</span>
                <button
                  onClick={handleStartEdit}
                  className="min-h-11 text-sm font-bold text-md3-on-surface hover:text-sage-600 transition-colors flex items-center gap-1"
                >
                  <Wallet size={12} />
                  {formatRpFull(settings.startingBalance)}
                </button>
              </div>
            )}
            {!editingSaldo && settings.startingBalanceDate && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-md3-on-surface-variant">Per tanggal</span>
                <span className="text-[10px] font-semibold text-md3-on-surface-variant flex items-center gap-1">
                  <Calendar size={9} />
                  {formatDateDisplay(settings.startingBalanceDate)}
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-sm font-medium text-md3-on-surface-variant">Suara</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label={`Efek suara ${soundEnabled ? "aktif" : "nonaktif"}`}
              aria-pressed={soundEnabled}
              className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
            >
              <span
                className="relative block h-6 w-11 rounded-full transition-colors"
                style={{ background: soundEnabled ? THEME.primary : THEME.surfaceWarm }}
              >
                <span
                  className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-md3-surface-container-lowest shadow-warm transition-transform"
                  style={{ transform: `translateX(${soundEnabled ? "22px" : "0"})` }}
                />
              </span>
            </button>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-sm font-medium text-md3-on-surface-variant">Getaran</span>
            <button
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              aria-label={`Umpan balik getar ${hapticsEnabled ? "aktif" : "nonaktif"}`}
              aria-pressed={hapticsEnabled}
              className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-200 focus-visible:ring-offset-2"
            >
              <span
                className="relative block h-6 w-11 rounded-full transition-colors"
                style={{ background: hapticsEnabled ? THEME.primary : THEME.surfaceWarm }}
              >
                <span
                  className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-md3-surface-container-lowest shadow-warm transition-transform"
                  style={{ transform: `translateX(${hapticsEnabled ? "22px" : "0"})` }}
                />
              </span>
            </button>
          </div>
        </div>
      </section>

      {showCategoryManager && (
        <CategoryManager
          categories={settings.categories}
          onClose={() => setShowCategoryManager(false)}
          onSaved={async () => {
            await refetchSettings()
            onRefresh?.()
          }}
        />
      )}

      {/* Wave 2: ownership hub — connection identity lives with the balance editor. */}
      <div className="space-y-4">
        <SheetsHubCard lastSyncAt={lastSyncAt} isOnline={isOnline} onRefresh={onRefresh} refreshing={refreshing} />
        <BalanceCheckpointCard data={data} onRefresh={onRefresh} onToast={onToast} header={false} />
      </div>

      <section aria-label="Panduan">
        <SectionTitle>Panduan</SectionTitle>
        <DocsSection />
      </section>

      <div className="flex items-center justify-center gap-6 pt-2">
        <button onClick={() => signOut({ callbackUrl: "/" })} aria-label="Keluar" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-md3-on-surface-variant hover:opacity-80 transition-opacity">
          <LogOut size={14} aria-hidden="true" /> Keluar
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteAccount(true)}
          className="min-h-11 text-sm font-bold text-rose-500 hover:opacity-80 transition-opacity"
        >
          Hapus akun
        </button>
      </div>
      <Sheet
        open={showDeleteAccount}
        onClose={() => !deletingAccount && setShowDeleteAccount(false)}
        title="Hapus akun Artami?"
        closeOnBackdrop={!deletingAccount}
        footer={
          <div className="flex gap-2">
            <button className="flex-1 rounded-2xl bg-md3-surface-container-high py-3 font-bold" disabled={deletingAccount} onClick={() => setShowDeleteAccount(false)}>
              Batal
            </button>
            <button
              className="flex-1 rounded-2xl bg-rose-600 py-3 font-bold text-white disabled:opacity-50"
              disabled={deletingAccount}
              onClick={async () => {
                setDeletingAccount(true)
                const response = await fetch("/api/account", { method: "DELETE" })
                if (response.ok) await signOut({ callbackUrl: "/" })
                else {
                  onToast?.("Gagal menghapus akun. Silakan coba lagi.", "error")
                  setDeletingAccount(false)
                }
              }}
            >
              {deletingAccount ? "Menghapus..." : "Hapus permanen"}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-md3-on-surface-variant">
          Akses Pro akan dicabut. Nama, foto, Google ID, tautan spreadsheet, dan bukti pembayaran akan dihapus.
          Email serta riwayat pembayaran tetap disimpan untuk audit dan kemungkinan pemulihan Pro oleh admin atas alasan yang sah.
        </p>
      </Sheet>
    </div>
  )
}
