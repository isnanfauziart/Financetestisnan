"use client"
import { useState } from "react"
import { X, Target, Sparkles, Shield, Plane, Home, Car, Heart, BookOpen, Gift, Laptop, Camera, PiggyBank, Star, Sun, Moon, Flag, Wallet } from "lucide-react"
import { THEME, SAVINGS_CATEGORIES, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatInputRupiah } from "@/app/dashboard/_components/helpers"
import SelectField from "@/app/dashboard/_components/SelectField"
import Sheet from "@/app/dashboard/_components/Sheet"

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [String(CURRENT_YEAR), String(CURRENT_YEAR + 1), String(CURRENT_YEAR + 2), String(CURRENT_YEAR + 3)]

const ICON_OPTIONS = [
  { name: "Target", Icon: Target },
  { name: "Shield", Icon: Shield },
  { name: "Plane", Icon: Plane },
  { name: "Home", Icon: Home },
  { name: "Car", Icon: Car },
  { name: "Heart", Icon: Heart },
  { name: "BookOpen", Icon: BookOpen },
  { name: "Gift", Icon: Gift },
  { name: "Laptop", Icon: Laptop },
  { name: "Camera", Icon: Camera },
  { name: "PiggyBank", Icon: PiggyBank },
  { name: "Wallet", Icon: Wallet },
  { name: "Star", Icon: Star },
  { name: "Sun", Icon: Sun },
  { name: "Moon", Icon: Moon },
  { name: "Flag", Icon: Flag },
  { name: "Sparkles", Icon: Sparkles },
]

const COLOR_OPTIONS = [
  { name: "Moss", value: "#5b8c7a" },
  { name: "Sage", value: "#7c8c5a" },
  { name: "Violet", value: "#9f87ef" },
  { name: "Amber", value: "#d4a853" },
  { name: "Clay", value: "#c47d5a" },
  { name: "Rose", value: "#c44545" },
  { name: "Indigo", value: "#5069cc" },
]

function getIconComponent(name) {
  const found = ICON_OPTIONS.find(o => o.name === name)
  return found ? found.Icon : Target
}

function parseDeadline(deadline) {
  if (!deadline) return { month: null, year: null }
  const m = String(deadline).match(/^(\d{4})(?:-(\d{1,2}))?/)
  if (!m) return { month: null, year: null }
  const year = m[1]
  const monthIdx = m[2] ? Math.max(0, Math.min(11, parseInt(m[2], 10) - 1)) : null
  return { month: monthIdx !== null ? AVAILABLE_MONTHS[monthIdx] : null, year }
}

function buildDeadline(month, year) {
  if (!year) return ""
  if (!month) return `${year}`
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx < 0) return `${year}`
  return `${year}-${String(idx + 1).padStart(2, "0")}`
}

export default function GoalSetupModal({ goal, defaultMonth, defaultYear, onClose, onSaved }) {
  const isEdit = Boolean(goal)
  const initDeadline = parseDeadline(goal?.deadline)
  const [nama, setNama] = useState(goal?.nama || "")
  const [rawTarget, setRawTarget] = useState(goal?.target ? formatInputRupiah(String(goal.target)) : "")
  const [month, setMonth] = useState(initDeadline.month || defaultMonth || AVAILABLE_MONTHS[new Date().getMonth()])
  const [year, setYear] = useState(initDeadline.year || String(defaultYear || CURRENT_YEAR))
  const [kategori, setKategori] = useState(goal?.kategori || SAVINGS_CATEGORIES[0])
  const [icon, setIcon] = useState(goal?.icon || "Target")
  const [color, setColor] = useState(goal?.color || "#5b8c7a")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nama || !rawTarget) {
      setError("Nama dan target wajib diisi")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const targetNum = parseFloat(rawTarget.replace(/\./g, ""))
      if (!targetNum || targetNum <= 0) {
        setError("Target harus lebih besar dari 0")
        setSubmitting(false)
        return
      }
      const body = {
        nama,
        target: targetNum,
        deadline: buildDeadline(month, year),
        kategori,
        icon,
        color,
      }
      const res = await fetch("/api/goals", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ...(isEdit ? { id: goal.id } : {}) }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan")
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  const SelectedIcon = getIconComponent(icon)
  const selectedColorMeta = COLOR_OPTIONS.find(c => c.value === color) || COLOR_OPTIONS[0]

  return (
    <Sheet
      open={true}
      onClose={onClose}
      subtitle={isEdit ? "Edit Goal" : "New Goal"}
      size="md"
      maxHeight="90vh"
      closeOnBackdrop={!submitting}
      header={
        <div className="flex items-center gap-2">
          <Target size={18} color={THEME.primary} aria-hidden="true" />
          <h3 className="text-lg font-display font-bold text-earth-800">
            {isEdit ? "Ubah Goal" : "Buat Goal"}
          </h3>
        </div>
      }
    >
      <div className="rounded-2xl p-3 mb-4 flex items-center gap-3" style={{ background: selectedColorMeta.value + "14" }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: selectedColorMeta.value + "22", color: selectedColorMeta.value }}>
          <SelectedIcon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-earth-800 truncate">{nama || "Nama goal kamu"}</p>
          <p className="text-[11px] text-earth-500">{rawTarget ? `Rp ${rawTarget}` : "Rp 0"} · {month} {year}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="goal-name" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Nama Goal</label>
          <input id="goal-name" type="text" placeholder="e.g. Dana Darurat" value={nama} onChange={e => setNama(e.target.value)}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200" />
        </div>

        <div>
          <label htmlFor="goal-target" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Target (Rp)</label>
          <input id="goal-target" type="text" inputMode="numeric" placeholder="50000000" value={rawTarget} onChange={e => setRawTarget(formatInputRupiah(e.target.value))}
            className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Bulan" value={month} onChange={setMonth} options={AVAILABLE_MONTHS} placeholder="Bulan" />
          <SelectField label="Tahun" value={year} onChange={setYear} options={YEAR_OPTIONS} placeholder="Tahun" />
        </div>

        <SelectField label="Kategori (auto-link)" value={kategori} onChange={setKategori} options={SAVINGS_CATEGORIES} placeholder="Pilih kategori" />

        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Icon</label>
          <div className="grid grid-cols-8 gap-1.5">
            {ICON_OPTIONS.map(({ name, Icon }) => (
              <button key={name} type="button" onClick={() => setIcon(name)} aria-label={name} aria-pressed={icon === name}
                className="aspect-square rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: icon === name ? color + "22" : "#fdf6ea",
                  color: icon === name ? color : "#9c8978",
                  boxShadow: icon === name ? "inset 0 0 0 2px " + color : "none",
                }}>
                <Icon size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Warna</label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map(c => (
              <button key={c.value} type="button" onClick={() => setColor(c.value)} aria-label={c.name} aria-pressed={color === c.value}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{ background: c.value, boxShadow: color === c.value ? "0 0 0 3px white, 0 0 0 5px " + c.value : "0 0 0 1px rgba(0,0,0,0.05)" }}>
                {color === c.value && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting ? "#ccc" : `linear-gradient(135deg, #4a3d33, ${color})` }}>
          {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : isEdit ? "Simpan Perubahan" : "Buat Goal"}
        </button>
      </form>
    </Sheet>
  )
}
