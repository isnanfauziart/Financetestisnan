"use client"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { MoreVertical, Pencil, Repeat, Trash2 } from "lucide-react"

// ponytail: fixed 176px menu width / ~100px height estimate for viewport clamping,
// same approach as SelectField; measure-and-reflow only if menus ever grow.
const MENU_WIDTH = 176

export default function RowActionsMenu({ onEdit, onDelete, onRepeat, repeatLabel = "Ulangi", editLabel = "Edit", deleteLabel = "Hapus", menuLabel = "Menu aksi", items }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  // Item 9: optional custom menu items (e.g. bill row overflow) — each item
  // is { label, icon: IconComponent, onClick, ariaLabel, danger }.
  const menuItems = items || [
    ...(onEdit ? [{ label: editLabel, icon: Pencil, onClick: onEdit, ariaLabel: editLabel }] : []),
    ...(onRepeat ? [{ label: repeatLabel, icon: Repeat, onClick: onRepeat, ariaLabel: repeatLabel }] : []),
    ...(onDelete ? [{ label: deleteLabel, icon: Trash2, onClick: onDelete, ariaLabel: deleteLabel, danger: true }] : []),
  ]

  useEffect(() => {
    if (!open) return
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      let left = rect.right - MENU_WIDTH
      left = Math.max(8, Math.min(left, window.innerWidth - MENU_WIDTH - 8))
      setPos({ top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 104)), left })
    }
    // Outside-click uses mousedown ONLY — touchstart fires before click and eats taps.
    const handleOutside = (e) => {
      if (btnRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const handleEscape = (e) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  // Body portal escapes .glass backdrop-filter stacking contexts (SelectField precedent).
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="min-h-11 min-w-11 rounded-xl bg-md3-surface hover:bg-md3-surface-container-high flex items-center justify-center flex-shrink-0 text-md3-on-surface-variant hover:text-md3-on-surface-variant transition-colors"
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={menuLabel}
          className="fixed z-[9999] glass-strong rounded-2xl overflow-hidden shadow-pop-lg w-44 py-1 animate-scale-in motion-reduce:animate-none"
          style={{ top: pos.top, left: pos.left }}
        >
          {menuItems.filter((item) => typeof item.onClick === "function").map((item) => {
            const ItemIcon = item.icon
            return (
              <button
                key={item.ariaLabel || item.label}
                type="button"
                role="menuitem"
                aria-label={item.ariaLabel || item.label}
                onClick={() => { setOpen(false); item.onClick() }}
                className={`min-h-11 w-full flex items-center gap-2.5 px-4 text-sm font-semibold transition-colors text-left ${
                  item.danger
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-md3-on-surface hover:bg-md3-surface-container-high"
                }`}
              >
                {ItemIcon && <ItemIcon size={14} aria-hidden="true" />} {item.label}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
