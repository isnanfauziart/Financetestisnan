"use client"
import { Children, isValidElement, useEffect, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function getFocusableElements(panel) {
  if (!panel) return []
  return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter((node) => !node.hasAttribute("disabled"))
}

function getNodeText(node) {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join(" ")
  if (isValidElement(node)) return getNodeText(node.props.children)
  return ""
}

function hasCloseControl(node) {
  return Children.toArray(node).some((child) => {
    if (!isValidElement(child)) return false
    if (child.type === "button") {
      const label = String(child.props["aria-label"] || "").toLowerCase()
      if (child.props["data-sheet-close"] || label.includes("close") || label.includes("tutup")) return true
    }
    return hasCloseControl(child.props.children)
  })
}

function CloseButton({ onClose, closeButtonRef, className = "" }) {
  return (
    <button
      type="button"
      ref={closeButtonRef}
      onClick={onClose}
      aria-label="Close"
      className={`w-8 h-8 rounded-full bg-md3-surface hover:bg-md3-surface-container-high transition-colors flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 ${className}`}
    >
      <X size={14} color="#6b5b4f" aria-hidden="true" />
    </button>
  )
}

function DefaultHeader({ title, subtitle, onClose, closeButtonRef, closeButtonClassName }) {
  return (
    <div className="flex justify-between items-start mb-4">
      <div className="min-w-0 flex-1">
        {subtitle && (
          <p className="text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant mb-0.5">
            {subtitle}
          </p>
        )}
        <h3 className="text-lg font-display font-bold text-md3-on-surface">{title}</h3>
      </div>
      <CloseButton onClose={onClose} closeButtonRef={closeButtonRef} className={closeButtonClassName} />
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
  position = "bottom",
  closeButtonClassName = "",
}) {
  const backdropRef = useRef(null)
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)
  const wasOpenRef = useRef(false)
  const customHeaderHasClose = header ? hasCloseControl(header) : false
  const customHeaderText = header ? getNodeText(header).trim() : ""
  const dialogName = ariaLabel || title || customHeaderText || "Dialog"
  const sharedCloseNeeded = Boolean(header ? !customHeaderHasClose : !title)

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

  useLayoutEffect(() => {
    if (open) {
      if (!wasOpenRef.current) {
        wasOpenRef.current = true
        previousFocusRef.current = document.activeElement
        const initialFocus = closeButtonRef.current || getFocusableElements(panelRef.current)[0] || panelRef.current
        initialFocus?.focus()
      }
      return
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false
      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" }[size] || "max-w-md"

  const trapFocus = (event) => {
    if (event.key !== "Tab" || !panelRef.current) return

    const items = getFocusableElements(panelRef.current)
    if (items.length === 0) return

    const first = items[0]
    const last = items[items.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex ${position === "center" ? "items-center" : "items-end sm:items-center"} justify-center`}
      style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === backdropRef.current) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full ${sizeClass} overflow-y-auto animate-slide-up`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapFocus}
        role="dialog"
        aria-modal="true"
        aria-label={dialogName}
        tabIndex={-1}
      >
        {position !== "center" && (
          <div aria-hidden="true" className="mx-auto mb-4 h-1 w-8 rounded-full bg-md3-surface-container-highest" />
        )}
        {header ? (
          <div className={`mb-4 ${sharedCloseNeeded ? "relative pr-10" : ""}`}>
            {header}
            {sharedCloseNeeded && <CloseButton onClose={onClose} closeButtonRef={closeButtonRef} className={`absolute top-0 right-0 ${closeButtonClassName}`} />}
          </div>
        ) : title ? (
          <DefaultHeader
            title={title}
            subtitle={subtitle}
            onClose={onClose}
            closeButtonRef={closeButtonRef}
            closeButtonClassName={closeButtonClassName}
          />
        ) : (
          <div className="mb-4 flex justify-end">
            <CloseButton onClose={onClose} closeButtonRef={closeButtonRef} className={closeButtonClassName} />
          </div>
        )}
        {children}
        {footer && (
          <div className="mt-4 pt-4 border-t border-md3-outline-variant">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  )
}
