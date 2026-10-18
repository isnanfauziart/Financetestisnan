"use client"
import { useRef, useState } from "react"
import { GripVertical, ChevronUp, ChevronDown, RotateCcw, X } from "lucide-react"
import Sheet from "./Sheet"
import { HOME_CARD_DEFS } from "@/lib/homeLayout"

/**
 * Item 20 — "Atur tampilan Beranda" sheet.
 * Drag handles reorder on desktop (HTML5 DnD); chevron buttons cover touch.
 * Toggles hide cards (hero is locked and always visible). "Atur ulang"
 * restores the default order/visibility.
 */
export default function HomeLayoutSheet({ open, onClose, layout, onChange }) {
  const [dragKey, setDragKey] = useState(null)
  const dragOverKey = useRef(null)

  if (!open) return null

  const { order, hidden } = layout
  const isHidden = (key) => hidden.includes(key)
  const defFor = (key) => HOME_CARD_DEFS.find((d) => d.key === key)

  const move = (key, dir) => {
    // The hero is locked in the first slot — it can never be reordered.
    if (defFor(key)?.locked) return
    const idx = order.indexOf(key)
    const next = idx + dir
    if (idx < 0 || next < 0 || next >= order.length) return
    const newOrder = [...order]
    const [moved] = newOrder.splice(idx, 1)
    newOrder.splice(next, 0, moved)
    onChange({ ...layout, order: newOrder })
  }

  const toggle = (key) => {
    const def = defFor(key)
    if (def?.locked) return
    onChange({
      ...layout,
      hidden: isHidden(key) ? hidden.filter((k) => k !== key) : [...hidden, key],
    })
  }

  const onDragStart = (key) => setDragKey(key)
  const onDragOver = (e, key) => {
    e.preventDefault()
    dragOverKey.current = key
  }
  const onDrop = (key) => {
    if (!dragKey || dragKey === key) {
      setDragKey(null)
      return
    }
    const newOrder = order.filter((k) => k !== dragKey)
    newOrder.splice(newOrder.indexOf(key), 0, dragKey)
    onChange({ ...layout, order: newOrder })
    setDragKey(null)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Atur tampilan Beranda" subtitle="Seret untuk menyusun ulang · matikan yang tidak perlu" size="md" maxHeight="85vh">
      <ul className="space-y-2" aria-label="Daftar kartu Beranda">
        {order.map((key) => {
          const def = defFor(key)
          if (!def) return null
          const hiddenNow = isHidden(key)
          return (
            <li
              key={key}
              draggable={!def.locked}
              onDragStart={() => onDragStart(key)}
              onDragOver={(e) => onDragOver(e, key)}
              onDrop={() => onDrop(key)}
              onDragEnd={() => setDragKey(null)}
              className={`flex items-center gap-2.5 rounded-2xl border border-md3-outline-variant bg-md3-surface-container-lowest p-3 ${hiddenNow ? "opacity-55" : ""} ${dragKey === key ? "opacity-40" : ""}`}
            >
              <span className="cursor-grab text-md3-on-surface-variant" aria-hidden="true">
                <GripVertical size={16} />
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold text-md3-on-surface">{def.label}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(key, -1)}
                  disabled={def.locked || order.indexOf(key) === 0}
                  aria-label={`Pindahkan ${def.label} ke atas`}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-md3-on-surface-variant transition-colors hover:bg-md3-surface-container-high disabled:opacity-30"
                >
                  <ChevronUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(key, 1)}
                  disabled={def.locked || order.indexOf(key) === order.length - 1}
                  aria-label={`Pindahkan ${def.label} ke bawah`}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-md3-on-surface-variant transition-colors hover:bg-md3-surface-container-high disabled:opacity-30"
                >
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!hiddenNow}
                  aria-label={hiddenNow ? `Tampilkan ${def.label}` : `Sembunyikan ${def.label}`}
                  disabled={def.locked}
                  onClick={() => toggle(key)}
                  className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${hiddenNow ? "bg-md3-surface-container-high" : "bg-[#2F6B57]"} ${def.locked ? "opacity-40" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${hiddenNow ? "left-1" : "left-6"}`}
                  />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ order: HOME_CARD_DEFS.map((d) => d.key), hidden: [] })}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-md3-outline-variant bg-md3-surface px-3 text-xs font-bold text-md3-on-surface-variant transition-colors hover:bg-md3-surface-container-low"
        >
          <RotateCcw size={13} aria-hidden="true" /> Atur ulang
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#2F6B57] px-3 text-xs font-bold text-white transition-transform active:scale-[0.97]"
        >
          <X size={13} aria-hidden="true" /> Selesai
        </button>
      </div>
    </Sheet>
  )
}
