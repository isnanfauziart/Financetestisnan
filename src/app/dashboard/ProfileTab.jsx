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
import UserNameSetup from "@/components/UserNameSetup"

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

function SectionCard({ title, children }) {
  return (
    <section className="w-full bento-tile bg-md3-surface-container-lowest border border-md3-outline-variant p-5 shadow-warm space-y-4" aria-label={title}>
      <div className="flex items-center justify-between border-b border-md3-outline-variant pb-3">
        <h3 className="text-sm font-bold tracking-wide text-md3-on-surface uppercase">{title}</h3>
      </div>
      {children}
    </section>
  )
}

export default function ProfileTab({ userName, session, data, entitlement, signOut, soundEnabled, setSoundEnabled, hapticsEnabled, setHapticsEnabled, onToast, onRefresh }) {
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
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
    <div className="px-5 pt-4 flex flex-col items-center animate-bento-in gap-4" key="profile-tab">
      <div className="relative mb-1">
        <img src={session?.user?.image} alt="" className="w-24 h-24 rounded-3xl border-4 border-white shadow-pop-lg" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-moss-500 border-2 border-white rounded-2xl" />
      </div>
      <h2 className="text-2xl font-display font-bold mb-1 text-md3-on-surface">{displayName}</h2>
      <p className="text-sm font-medium text-md3-on-surface-variant mb-2">{session?.user?.email}</p>

      <SectionCard title="Tentang akunmu">
        <div className="flex justify-between items-center border-b border-md3-outline-variant pb-3">
          <span className="text-sm font-medium text-md3-on-surface-variant">Akun</span>
          <span className="text-sm font-bold text-md3-on-surface">Personal</span>
        </div>
        <div className="flex justify-between items-center border-b border-md3-outline-variant pb-3">
          <span className="text-sm font-medium text-md3-on-surface-variant">Email</span>
          <span className="text-sm font-bold text-md3-on-surface truncate max-w-[60%] text-right">{session?.user?.email || "—"}</span>
        </div>
        <UserNameSetup
          initialValue={settings.userName || displayName}
          open={true}
          mode="settings"
          onSaved={() => refetchSettings()}
        />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-md3-on-surface-variant">Total Transaksi</span>
          <span className="text-sm font-bold text-md3-on-surface">{data?.transactions?.length || 0}</span>
        </div>
      </SectionCard>

      <SectionCard title="Data Milikmu">
        <div className="space-y-3 text-sm leading-relaxed text-md3-on-surface-variant">
          <p>Catatan keuanganmu tetap berada di Google Sheets milikmu.</p>
          <p>Artami tidak menghubungkan rekening bank.</p>
          <p>Tidak ada iklan.</p>
        </div>
      </SectionCard>

      <SectionCard title="Paket kamu">
        <div className="flex justify-between items-center border-b border-md3-outline-variant pb-3">
          <span className="text-sm font-medium text-md3-on-surface-variant">Paket</span>
          <span className="text-sm font-bold text-md3-on-surface">{tierLabel}</span>
        </div>
        <div className="flex justify-between items-center border-b border-md3-outline-variant pb-3">
          <span className="text-sm font-medium text-md3-on-surface-variant">Akses</span>
          <span className="text-sm font-bold text-md3-on-surface">{tierLabel === "Pro" ? "Seumur hidup" : "Free tier"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-md3-on-surface-variant">Data disimpan di</span>
          <span className="text-sm font-bold text-md3-on-surface">Google Sheets</span>
        </div>
        {(data?.history?.limited || entitlement?.history?.months === 4) && (
          <p className="border-t border-md3-outline-variant pt-3 text-xs leading-relaxed text-md3-on-surface-variant">
            Data lama tetap aman dan bisa kamu buka di Google Sheets.
          </p>
        )}
        {quotaEntries.length > 0 && (
          <div className="space-y-2 border-t border-md3-outline-variant pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">Pemakaianmu</p>
            {quotaEntries.map(([feature, item]) => (
              <div key={feature} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-md3-on-surface-variant">{QUOTA_LABELS[feature] || feature}</span>
                <span className={`text-right font-bold ${item.warning === "reached" ? "text-rose-600" : item.warning === "near" ? "text-amber-600" : "text-md3-on-surface"}`}>
                  {item.limit === null ? "Tanpa batas" : item.current === null ? `— / ${item.limit}` : `${item.current} / ${item.limit}`}
                  {item.warning === "near" && <span className="block text-[10px]" role="status">Hampir mencapai batas</span>}
                  {item.warning === "reached" && <span className="block text-[10px]" role="alert">Batas sudah terpakai</span>}
                </span>
              </div>
            ))}
          </div>
        )}
        {tierLabel === "Pro" ? (
          <div className="mt-4 rounded-2xl border border-moss-100 bg-moss-50 p-4 text-sm text-moss-800">
            <p className="font-bold">Kamu sudah memakai Artami Pro.</p>
            <p className="mt-1 leading-relaxed">
              Silakan nikmati semua fitur yang tersedia. Semoga Artami membantu mengelola keuangan kamu. Terima kasih!
            </p>
            <ul className="mt-3 space-y-1 text-xs font-semibold text-moss-700">
              <li>✓ Transaksi dan riwayat tanpa batas</li>
              <li>✓ Anggaran, target, tagihan, dan fitur pintar</li>
              <li>✓ Akses Pro seumur hidup</li>
            </ul>
          </div>
        ) : (
          <Link
            href="/upgrade"
            className="mt-4 block w-full rounded-2xl bg-violet-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-violet-700"
          >
            Upgrade ke Pro
          </Link>
        )}
      </SectionCard>

      <SectionCard title="Pengaturan">
        <div className="border-b border-md3-outline-variant pb-3">
          <p className="text-sm font-medium text-md3-on-surface">Tema</p>
          <p className="mt-0.5 mb-2 text-xs leading-relaxed text-md3-on-surface-variant">Tampilan terang, gelap, atau ikuti pengaturan sistem.</p>
          <SegmentedButtons
            options={THEME_OPTIONS}
            value={THEME_LABEL_BY_MODE[themeMode]}
            onChange={(label) => setThemeMode(THEME_MODE_BY_LABEL[label])}
            ariaLabel="Pilih tema tampilan"
          />
        </div>
        <div className="flex items-center gap-3 border-b border-md3-outline-variant pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-md3-on-surface">Kategori</p>
            <p className="mt-0.5 text-xs leading-relaxed text-md3-on-surface-variant">Sesuaikan kategori pengeluaran, pemasukan, dan tabunganmu.</p>
          </div>
          <button type="button" onClick={() => setShowCategoryManager(true)} className="min-h-11 min-w-11 rounded-xl bg-sage-100 px-3 py-2 text-xs font-bold text-sage-700 hover:bg-sage-200 transition-colors">Atur kategori</button>
        </div>
        <div className="flex justify-between items-center border-b border-md3-outline-variant pb-3">
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
        <div className="flex justify-between items-center">
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
      </SectionCard>

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

      <SectionCard title="Data & akun">
        {editingSaldo ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-md3-on-surface-variant">Saldo Awal</span>
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
          <div className="border-b border-md3-outline-variant pb-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-md3-on-surface-variant">Saldo Awal</span>
              <button
                onClick={handleStartEdit}
                className="min-h-11 text-sm font-bold text-md3-on-surface hover:text-sage-600 transition-colors flex items-center gap-1"
              >
                <Wallet size={12} />
                {formatRpFull(settings.startingBalance)}
              </button>
            </div>
            {settings.startingBalanceDate && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-md3-on-surface-variant">Per tanggal</span>
                <span className="text-[10px] font-semibold text-md3-on-surface-variant flex items-center gap-1">
                  <Calendar size={9} />
                  {formatDateDisplay(settings.startingBalanceDate)}
                </span>
              </div>
            )}
          </div>
        )}
        <button onClick={() => signOut({ callbackUrl: "/" })} aria-label="Keluar" className="w-full min-h-11 pt-2 flex items-center justify-between group">
          <span className="text-sm font-bold text-rose-500 group-hover:opacity-80 transition-opacity">Keluar</span>
          <LogOut size={16} color={THEME.danger} aria-hidden="true" className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteAccount(true)}
          className="w-full min-h-11 pt-3 text-left text-sm font-bold text-rose-600"
        >
          Hapus Akun
        </button>
      </SectionCard>
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
