"use client"
import { useState, useMemo } from "react"
import { THEME, EVENT_COLORS, AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { formatInputRupiah } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"
import SelectField from "@/app/dashboard/_components/SelectField"
import { EVENT_TEMPLATE_LIST, getTemplate } from "@/lib/eventTemplates"

const MONTH_OPTIONS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function getDefaultDateRange(templateKey) {
  const today = new Date()
  const t = getTemplate(templateKey)
  const duration = t?.defaultDuration || 30
  const start = new Date(today)
  const end = new Date(today)
  end.setDate(end.getDate() + duration)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

export default function EventSetupModal({ event, onClose, onSaved }) {
  const isEdit = !!event

  const [selectedTemplate, setSelectedTemplate] = useState(event?.tipe || "")
  const [nama, setNama] = useState(event?.nama || "")
  const [rawBudget, setRawBudget] = useState(event ? String(event.totalBudget) : "")
  const [tanggalMulai, setTanggalMulai] = useState(event?.tanggalMulai || "")
  const [tanggalSelesai, setTanggalSelesai] = useState(event?.tanggalSelesai || "")
  const [mode, setMode] = useState(event?.mode || "independent")
  const [danaTHR, setDanaTHR] = useState(event?.danaTHR ? String(event.danaTHR) : "")
  const [rawDanaTHR, setRawDanaTHR] = useState(event?.danaTHR ? formatInputRupiah(String(event.danaTHR)) : "")
  const [catatan, setCatatan] = useState(event?.catatan || "")
  const [subCategories, setSubCategories] = useState(event?.subCategories || [])
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(isEdit ? "form" : "template")

  const template = useMemo(() => getTemplate(selectedTemplate), [selectedTemplate])

  const handleSelectTemplate = (key) => {
    setSelectedTemplate(key)
    const t = getTemplate(key)
    if (t) {
      setNama(t.nama + " " + new Date().getFullYear())
      const dates = getDefaultDateRange(key)
      setTanggalMulai(dates.start)
      setTanggalSelesai(dates.end)
      setSubCategories(t.subCategories.map(s => ({ ...s })))
    }
    setStep("form")
  }

  const handleCustom = () => {
    setSelectedTemplate("custom")
    const dates = getDefaultDateRange("custom")
    setTanggalMulai(dates.start)
    setTanggalSelesai(dates.end)
    setSubCategories([])
    setStep("form")
  }

  const handleAddSub = () => {
    setSubCategories(prev => [...prev, { kategori: "", limit: 0, icon: "" }])
  }

  const handleRemoveSub = (idx) => {
    setSubCategories(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateSub = (idx, field, value) => {
    setSubCategories(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const handleSave = async () => {
    if (!nama.trim()) return
    const parsedBudget = parseFloat(String(rawBudget).replace(/\./g, ""))
    if (!parsedBudget || parsedBudget <= 0) return
    if (!tanggalMulai || !tanggalSelesai) return

    setSaving(true)
    try {
      const url = isEdit ? `/api/momental/${event.id}` : "/api/momental"
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          tipe: selectedTemplate || "custom",
          totalBudget: parsedBudget,
          tanggalMulai,
          tanggalSelesai,
          mode,
          danaTHR: danaTHR ? parseFloat(danaTHR) : null,
          catatan,
          subCategories: subCategories.filter(s => s.kategori && s.limit > 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")
      onSaved()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Template picker step
  if (step === "template") {
    return (
      <Sheet open={true} onClose={onClose} title="Pilih Jenis Event" subtitle="Buat Event Budget" size="md" maxHeight="85vh">
        <div className="space-y-3">
          {EVENT_TEMPLATE_LIST.map(t => {
            const color = EVENT_COLORS[t.key] || THEME.primary
            return (
              <button
                key={t.key}
                onClick={() => handleSelectTemplate(t.key)}
                className="w-full text-left bento-tile bg-white border border-earth-100 p-4 rounded-2xl transition-all hover:shadow-pop active:scale-[0.99]"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "18", color }}>
                    <span className="text-lg">{t.icon === "GraduationCap" ? "🎓" : t.icon === "Moon" ? "🌙" : "📅"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-earth-800">{t.nama}</p>
                    <p className="text-[11px] text-earth-500">{t.subCategoryCount} sub-kategori</p>
                  </div>
                </div>
              </button>
            )
          })}
          <button
            onClick={handleCustom}
            className="w-full text-left bento-tile bg-white border border-earth-100 p-4 rounded-2xl transition-all hover:shadow-pop active:scale-[0.99]"
            style={{ borderLeft: `4px solid ${THEME.primary}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: THEME.primaryBg, color: THEME.primary }}>
                <span className="text-lg">✨</span>
              </div>
              <div>
                <p className="text-sm font-bold text-earth-800">Event Kustom</p>
                <p className="text-[11px] text-earth-500">Buat event dengan kategori sendiri</p>
              </div>
            </div>
          </button>
        </div>
      </Sheet>
    )
  }

  // Form step
  const eventColor = selectedTemplate === "anak-sekolah" ? EVENT_COLORS["anak-sekolah"] : selectedTemplate === "lebaran-thr" ? EVENT_COLORS["lebaran-thr"] : EVENT_COLORS.custom

  return (
    <Sheet open={true} onClose={onClose} title={isEdit ? "Edit Event" : "Buat Event Budget"} subtitle="Event Budget" size="md" maxHeight="90vh">
      <div className="space-y-4">
        {/* Nama */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Nama Event</label>
          <input type="text" value={nama} onChange={e => setNama(e.target.value)} placeholder="Contoh: Anak Masuk Sekolah 2026"
            className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200" />
        </div>

        {/* Total Budget */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Total Budget (Rp)</label>
          <input type="text" inputMode="numeric" value={rawBudget} onChange={e => setRawBudget(formatInputRupiah(e.target.value))} placeholder="0"
            className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200 font-semibold" />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tanggal Mulai</label>
            <input type="date" value={tanggalMulai} onChange={e => setTanggalMulai(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tanggal Selesai</label>
            <input type="date" value={tanggalSelesai} onChange={e => setTanggalSelesai(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200" />
          </div>
        </div>

        {/* Dana THR (only for Lebaran) */}
        {selectedTemplate === "lebaran-thr" && (
          <div>
            <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Estimasi Dana THR (Rp)</label>
            <input type="text" inputMode="numeric" value={rawDanaTHR} onChange={e => { setRawDanaTHR(formatInputRupiah(e.target.value)); setDanaTHR(e.target.value.replace(/\./g, "")) }} placeholder="0 (opsional)"
              className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200 font-semibold" />
            <p className="text-[10px] text-earth-400 mt-1">Digunakan untuk menghitung utilisasi THR</p>
          </div>
        )}

        {/* Mode */}
        <SelectField
          label="Mode Budget"
          value={mode === "independent" ? "Independent" : "Exempt"}
          onChange={v => setMode(v === "Independent" ? "independent" : "exempt")}
          options={["Independent", "Exempt"]}
          placeholder="Pilih mode"
        />
        <p className="text-[10px] text-earth-400 -mt-2">
          {mode === "independent"
            ? "Transaksi tetap terhitung di budget bulanan"
            : "Transaksi TAK terhitung di budget bulanan (untuk pengeluaran besar)"}
        </p>

        {/* Sub-Kategori */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-earth-500 uppercase tracking-wider">Sub-Kategori</label>
            <button onClick={handleAddSub} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: eventColor }}>
              + Tambah
            </button>
          </div>
          {subCategories.length === 0 ? (
            <p className="text-xs text-earth-400 text-center py-3">Belum ada sub-kategori</p>
          ) : (
            <div className="space-y-2">
              {subCategories.map((sub, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-earth-50">
                  <input type="text" value={sub.kategori} onChange={e => handleUpdateSub(i, "kategori", e.target.value)} placeholder="Nama"
                    className="flex-1 px-3 py-2 bg-white border border-earth-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-violet-200" />
                  <input type="text" inputMode="numeric" value={sub.limit ? formatInputRupiah(String(sub.limit)) : ""} onChange={e => handleUpdateSub(i, "limit", parseFloat(String(e.target.value).replace(/\./g, "")) || 0)} placeholder="Limit"
                    className="w-28 px-3 py-2 bg-white border border-earth-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-violet-200 font-semibold" />
                  <button onClick={() => handleRemoveSub(i)} className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 flex items-center justify-center text-earth-500 hover:text-rose-500 text-xs">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catatan */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Catatan</label>
          <textarea value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Catatan tambahan..." rows={2}
            className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200 resize-none" />
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !nama.trim() || !rawBudget || !tanggalMulai || !tanggalSelesai}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: saving ? "#ccc" : eventColor }}>
          {saving ? "Menyimpan..." : isEdit ? "Perbarui Event" : "Buat Event Budget"}
        </button>
      </div>
    </Sheet>
  )
}
