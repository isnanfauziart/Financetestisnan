"use client"
import { useEffect, useRef } from "react"
import { X } from "lucide-react"

function DefaultHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex justify-between items-start mb-4">
      <div className="min-w-0 flex-1">
        {subtitle && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-earth-500 mb-0.5">
            {subtitle}
          </p>
        )}
        <h3 className="text-lg font-display font-bold text-earth-800">{title}</h3>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center flex-shrink-0"
      >
        <X size={14} color="#6b5b4f" aria-hidden="true" />
      </button>
    </div>
  )
}

export default function Sheet({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  maxHeight = "85vh",
  closeOnBackdrop = true,
  closeOnEsc = true,
  header,
  footer,
  children,
  ariaLabel,
}) {
  const backdropRef = useRef(null)

  useEffect(() => {
    if (!open || !closeOnEsc) return
    const onEsc = (e) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onEsc)
    return () => window.removeEventListener("keydown", onEsc)
  }, [open, closeOnEsc, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[size] || "max-w-md"

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === backdropRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div
        className={`glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full ${sizeClass} overflow-y-auto animate-slide-up`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {header ? (
          <div className="mb-4">{header}</div>
        ) : title ? (
          <DefaultHeader title={title} subtitle={subtitle} onClose={onClose} />
        ) : null}
        {children}
        {footer && (
          <div className="mt-4 pt-4 border-t border-earth-100">{footer}</div>
        )}
      </div>
    </div>
  )
}
