"use client"
import { useState, useRef, useCallback, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { THEME } from "./constants"

export default function SelectField({ label, value, onChange, options, placeholder, isDark = false }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value)))
  const btnRef = useRef(null)
  const ddRef = useRef(null)
  const optionRefs = useRef([])
  const fieldId = useId().replace(/:/g, "")
  const buttonId = `select-${fieldId}`
  const listboxId = `${buttonId}-listbox`
  const labelId = label ? `${buttonId}-label` : undefined
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 })

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const dw = Math.max(rect.width, 160)
      const vh = window.innerHeight
      const vw = window.innerWidth
      const ddEstH = Math.min(options.length * 48, vh * 0.5)
      const spaceBelow = vh - rect.bottom - 8
      const openUp = spaceBelow < ddEstH && rect.top > ddEstH
      let left = rect.left
      if (left + dw > vw - 8) left = vw - dw - 8
      left = Math.max(8, left)
      const top = openUp ? Math.max(8, rect.top - ddEstH - 4) : rect.bottom + 4
      setPos({ top, left, width: dw })
    }
  }, [options.length])

  const close = useCallback(() => {
    setOpen(false)
    btnRef.current?.focus()
  }, [])

  const selectOption = useCallback((option) => {
    onChange(option)
    close()
  }, [close, onChange])

  const moveActive = useCallback((nextIndex) => {
    const next = Math.max(0, Math.min(options.length - 1, nextIndex))
    setActiveIndex(next)
    optionRefs.current[next]?.focus()
  }, [options.length])

  useEffect(() => {
    if (!open) return
    updatePos()
    const selectedIndex = Math.max(0, options.indexOf(value))
    setActiveIndex(selectedIndex)
    optionRefs.current[selectedIndex]?.focus()
    const handleOutside = (e) => {
      const isOutsideBtn = btnRef.current && !btnRef.current.contains(e.target)
      const isOutsideDd = !ddRef.current || (ddRef.current && !ddRef.current.contains(e.target))
      if (isOutsideBtn && isOutsideDd) setOpen(false)
    }
    const handleEscape = (e) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("scroll", updatePos, { passive: true })
    window.addEventListener("resize", updatePos, { passive: true })
    window.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleOutside)
    return () => {
      window.removeEventListener("scroll", updatePos)
      window.removeEventListener("resize", updatePos)
      window.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleOutside)
    }
  }, [close, open, options, updatePos, value])

  const handleButtonKeyDown = (e) => {
    if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) return
    e.preventDefault()
    if (!open) {
      updatePos()
      setOpen(true)
    }
  }

  const handleListboxKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      moveActive(activeIndex + 1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      moveActive(activeIndex - 1)
    } else if (e.key === "Home") {
      e.preventDefault()
      moveActive(0)
    } else if (e.key === "End") {
      e.preventDefault()
      moveActive(options.length - 1)
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (options[activeIndex] !== undefined) selectOption(options[activeIndex])
    } else if (e.key === "Escape") {
      e.preventDefault()
      close()
    }
  }

  return (
    <div className="relative">
      {label && <label id={labelId} htmlFor={buttonId} className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">{label}</label>}
      <button
        ref={btnRef}
        id={buttonId}
        type="button"
        aria-label={label || placeholder || "Pilih opsi"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onKeyDown={handleButtonKeyDown}
        onClick={() => { if (!open) updatePos(); setOpen(!open) }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm text-left transition-all active:scale-[0.98] ${
          isDark ? "bg-white/15 text-white hover:bg-white/20" : "glass text-earth-800 hover:bg-white/90"
        }`}
      >
        <span className="truncate font-medium">{value || placeholder}</span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 flex-shrink-0 ml-2 ${open ? "rotate-180" : ""} ${isDark ? "text-white/70" : "text-earth-500"}`} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={ddRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={options[activeIndex] !== undefined ? `${buttonId}-option-${activeIndex}` : undefined}
          onKeyDown={handleListboxKeyDown}
          className="fixed z-[9999] glass-strong rounded-2xl overflow-hidden shadow-pop-lg"
          style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: "50vh", overflowY: "auto" }}
        >
          {options.map((opt, index) => (
            <button
              key={opt}
              id={`${buttonId}-option-${index}`}
              ref={(node) => { optionRefs.current[index] = node }}
              type="button"
              role="option"
              aria-selected={value === opt}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => selectOption(opt)}
              className={`w-full text-left px-4 py-3.5 sm:py-3 text-sm hover:bg-earth-100/60 transition-colors border-b last:border-b-0 border-earth-100/40 ${index === activeIndex ? "bg-earth-100/60" : ""}`}
              style={{ color: value === opt ? THEME.primary : THEME.textPrimary, fontWeight: value === opt ? 700 : 500 }}
            >
              {opt}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
