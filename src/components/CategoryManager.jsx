"use client"

import { useMemo, useState } from "react"
import {
  BadgeDollarSign,
  BookOpen,
  Bus,
  Car,
  CircleDollarSign,
  Coins,
  Gem,
  Gift,
  HeartPulse,
  Home,
  Laptop,
  PiggyBank,
  Plane,
  Popcorn,
  Receipt,
  Scale,
  ShieldPlus,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wallet,
} from "lucide-react"
import Sheet from "@/app/dashboard/_components/Sheet"
import { THEME } from "@/app/dashboard/_components/constants"

const TYPE_OPTIONS = [
  { key: "expense", label: "Pengeluaran" },
  { key: "income", label: "Pemasukan" },
  { key: "savings", label: "Tabungan" },
]

const ICONS = {
  Wallet,
  Utensils,
  Bus,
  Car,
  ShoppingBag,
  Receipt,
  HeartPulse,
  Home,
  Gift,
  BookOpen,
  Sparkles,
  Popcorn,
  BadgeDollarSign,
  Coins,
  CircleDollarSign,
  PiggyBank,
  Gem,
  Plane,
  ShieldPlus,
  Laptop,
  Scale,
}

const ICON_OPTIONS = Object.keys(ICONS)

const RECOMMENDATIONS = {
  expense: [
    ["Makan & Minum", "Utensils"], ["Jajan", "Popcorn"], ["Transportasi", "Bus"],
    ["Belanja Harian", "ShoppingBag"], ["Tagihan", "Receipt"], ["Tempat Tinggal", "Home"],
    ["Kesehatan", "HeartPulse"], ["Pendidikan", "BookOpen"], ["Hiburan", "Sparkles"],
    ["Perawatan Diri", "Sparkles"], ["Keluarga", "Home"], ["Sedekah & Donasi", "Gift"],
    ["Kondangan & Hadiah", "Gift"], ["Utang", "Scale"], ["Lainnya", "Wallet"],
  ].map(([name, icon]) => ({ name, icon })),
  income: [
    ["Gaji", "BadgeDollarSign"], ["Bonus & THR", "Coins"], ["Freelance", "Laptop"],
    ["Usaha", "ShoppingBag"], ["Investasi", "CircleDollarSign"], ["Penjualan", "ShoppingBag"],
    ["Penggantian Biaya", "Receipt"], ["Pemberian", "Gift"], ["Piutang", "Coins"], ["Lainnya", "Wallet"],
  ].map(([name, icon]) => ({ name, icon })),
  savings: [
    ["Tabungan Cash", "PiggyBank", "liquid"], ["Dana Darurat", "ShieldPlus", "liquid"],
    ["Emas", "Gem", "investment"], ["Investasi", "CircleDollarSign", "investment"],
    ["Pendidikan", "BookOpen", "liquid"], ["Liburan", "Plane", "liquid"],
    ["Rumah", "Home", "liquid"], ["Kendaraan", "Car", "liquid"], ["Lainnya", "Wallet", "liquid"],
  ].map(([name, icon, savingsKind]) => ({ name, icon, savingsKind })),
}

function isProtected(type, item) {
  return Boolean(item?.protected || (type === "expense" && item?.name === "Utang") || (type === "income" && item?.name === "Piutang"))
}

function cloneCategories(categories) {
  return Object.fromEntries(TYPE_OPTIONS.map(({ key }) => [
    key,
    (categories?.[key] || []).map(item => ({
      ...item,
      name: String(item.name || "").trim(),
      active: item.active !== false,
      protected: isProtected(key, item),
      ...(key === "savings" ? { savingsKind: item.savingsKind || item.kind || "liquid" } : {}),
    })),
  ]))
}

function CategoryIcon({ name, size = 16 }) {
  const Icon = ICONS[name] || Wallet
  return <Icon size={size} aria-hidden="true" />
}

export default function CategoryManager({ categories, onSaved, onClose }) {
  const [draft, setDraft] = useState(() => cloneCategories(categories))
  const [activeType, setActiveType] = useState("expense")
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("Wallet")
  const [savingsKind, setSavingsKind] = useState("liquid")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const activeItems = draft[activeType].filter(item => item.active)
  const archivedItems = draft[activeType].filter(item => !item.active)
  const recommendations = useMemo(() => {
    const names = new Set(draft[activeType].map(item => item.name.toLowerCase()))
    return RECOMMENDATIONS[activeType].filter(item => !names.has(item.name.toLowerCase()))
  }, [activeType, draft])

  async function persist(next) {
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: next }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan kategori")
      setDraft(next)
      onSaved?.(next)
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function addCategory(event) {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setError("Nama kategori wajib diisi")
      return
    }
    if (draft[activeType].some(item => item.name.toLowerCase() === cleanName.toLowerCase())) {
      setError("Kategori dengan nama tersebut sudah ada")
      return
    }
    const next = {
      ...draft,
      [activeType]: [...draft[activeType], {
        name: cleanName,
        icon,
        active: true,
        ...(activeType === "savings" ? { savingsKind } : {}),
      }],
    }
    if (await persist(next)) {
      setName("")
      setIcon("Wallet")
      setSavingsKind("liquid")
      setShowForm(false)
    }
  }

  async function setActive(item, active) {
    if (isProtected(activeType, item)) return
    if (!active && !window.confirm(`Arsipkan kategori ${item.name}? Kategori tetap ada di riwayat, tetapi tidak dipakai untuk transaksi baru.`)) return
    const next = {
      ...draft,
      [activeType]: draft[activeType].map(current => current.name === item.name ? { ...current, active } : current),
    }
    await persist(next)
  }

  async function addRecommendation(item) {
    const next = {
      ...draft,
      [activeType]: [...draft[activeType], {
        ...item,
        active: true,
        ...(activeType === "savings" ? { savingsKind: item.savingsKind || "liquid" } : {}),
      }],
    }
    await persist(next)
  }

  const currentLabel = TYPE_OPTIONS.find(item => item.key === activeType)?.label

  return (
    <Sheet open={true} onClose={onClose} title="Kelola Kategori" subtitle="Kategori pribadi" size="lg" maxHeight="90vh" closeOnBackdrop={!saving}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-earth-500">
          Tambahkan kategori yang sesuai dengan kebiasaanmu. Kategori yang diarsipkan tetap aman di riwayat transaksi.
        </p>

        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-earth-50 p-1" role="tablist" aria-label="Jenis kategori">
          {TYPE_OPTIONS.map(type => (
            <button
              key={type.key}
              type="button"
              role="tab"
              aria-selected={activeType === type.key}
              onClick={() => { setActiveType(type.key); setShowForm(false); setError("") }}
              className={`rounded-xl px-2 py-2 text-xs font-bold transition-colors ${activeType === type.key ? "bg-white text-violet-700 shadow-warm" : "text-earth-500"}`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">{currentLabel} aktif</h4>
            <button type="button" onClick={() => { setShowForm(value => !value); setError("") }} className="rounded-xl bg-violet-100 px-3 py-2 text-xs font-bold text-violet-700">
              {showForm ? "Batal" : "+ Tambah kategori"}
            </button>
          </div>

          {activeItems.map(item => (
            <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-earth-100 bg-white px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-earth-50 text-earth-600"><CategoryIcon name={item.icon} /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-earth-800">{item.name}</span>
              {isProtected(activeType, item) ? (
                <span className="text-[10px] font-bold text-earth-400">Otomatis</span>
              ) : (
                <button type="button" disabled={saving} onClick={() => setActive(item, false)} aria-label={`Arsipkan ${item.name}`} className="text-[10px] font-bold text-earth-400 hover:text-rose-600 disabled:opacity-50">Arsipkan</button>
              )}
            </div>
          ))}
        </div>

        {showForm && (
          <form onSubmit={addCategory} className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
            <div>
              <label htmlFor="category-name" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-earth-500">Nama kategori</label>
              <input id="category-name" value={name} onChange={event => setName(event.target.value)} maxLength={48} autoFocus className="w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200" placeholder="Contoh: Kopi" />
            </div>
            <div>
              <label htmlFor="category-icon" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-earth-500">Icon</label>
              <select id="category-icon" value={icon} onChange={event => setIcon(event.target.value)} className="w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200">
                {ICON_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            {activeType === "savings" && (
              <div>
                <label htmlFor="category-kind" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-earth-500">Jenis dana</label>
                <select id="category-kind" value={savingsKind} onChange={event => setSavingsKind(event.target.value)} className="w-full rounded-xl border border-earth-100 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200">
                  <option value="liquid">Dana likuid</option>
                  <option value="investment">Investasi</option>
                </select>
              </div>
            )}
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-earth-900 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan kategori"}</button>
          </form>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-2 border-t border-earth-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">Rekomendasi</h4>
            <div className="flex flex-wrap gap-2">
              {recommendations.map(item => (
                <button key={item.name} type="button" disabled={saving} onClick={() => addRecommendation(item)} className="inline-flex items-center gap-1.5 rounded-full border border-earth-100 bg-white px-3 py-2 text-xs font-semibold text-earth-700 hover:border-violet-200 disabled:opacity-50">
                  <CategoryIcon name={item.icon} size={13} /> + {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {archivedItems.length > 0 && (
          <div className="space-y-2 border-t border-earth-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500">Diarsipkan</h4>
            {archivedItems.map(item => (
              <div key={item.name} className="flex items-center gap-3 rounded-2xl bg-earth-50 px-3 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-earth-400"><CategoryIcon name={item.icon} size={14} /></span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-earth-500">{item.name}</span>
                <button type="button" disabled={saving} onClick={() => setActive(item, true)} className="text-[10px] font-bold text-violet-700 disabled:opacity-50">Pulihkan</button>
              </div>
            ))}
          </div>
        )}

        {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}
        <p className="flex items-center gap-1 text-[10px] text-earth-400"><span style={{ color: THEME.primary }}>ⓘ</span> Utang dan Piutang dipakai oleh pembayaran otomatis dan tidak bisa diarsipkan.</p>
      </div>
    </Sheet>
  )
}
