"use client"
import { Children, isValidElement, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { THEME } from "./constants"

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// ---------------------------------------------------------------------------
// Wave 5 — modal history.
//
// An open sheet is the first Back destination: the dashboard's popstate
// listener calls closeTopSheetOnBack() before applying view state. Open sheets
// live on this module-level LIFO stack, so every existing sheet gets
// Back-to-close behavior with no per-callsite wiring.
//
// One history sentinel is kept while any sheet is open so Back never leaves
// the dashboard. When a Back press is consumed by a sheet (closing it or
// opening its discard confirmation) the sentinel is re-pushed only while a
// sheet remains open; the last close lets the popped entry stay popped.
// ---------------------------------------------------------------------------

const sheetStack = []
let sheetSentinelActive = false

function isOurSentinel(state) {
  return Boolean(state && state.__artamiSheetOpen)
}

/**
 * Give the topmost open sheet first claim on a Back press.
 * Returns true when a sheet consumed the pop (closing or asking for
 * confirmation); false when no sheet is open and the caller should handle it.
 */
export function closeTopSheetOnBack() {
  if (sheetStack.length === 0 || typeof window === "undefined") return false
  if (sheetSentinelActive && !isOurSentinel(window.history.state)) {
    // This pop consumed our sentinel.
    sheetSentinelActive = false
  }
  const handleBack = sheetStack[sheetStack.length - 1]
  const consumed = Boolean(handleBack())
  if (consumed && !sheetSentinelActive) {
    window.history.pushState({ __artamiSheetOpen: true }, "")
    sheetSentinelActive = true
  }
  return consumed
}

function SheetDiscardConfirm({ onCancel, onDiscard }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-5"
      style={{ background: "rgba(42,32,24,0.6)", backdropFilter: "blur(6px)" }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sheet-discard-title"
        aria-describedby="sheet-discard-desc"
        className="w-full max-w-sm rounded-[28px] bg-md3-surface p-6 shadow-pop-lg"
      >
        <h2 id="sheet-discard-title" className="font-display text-lg font-bold text-md3-on-surface">Buang perubahan?</h2>
        <p id="sheet-discard-desc" className="mt-1.5 text-sm text-md3-on-surface-variant">
          Ada perubahan yang belum disimpan. Jika kamu kembali sekarang, perubahan ini akan hilang.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-2xl bg-md3-surface-container-high px-4 py-2.5 text-sm font-bold text-md3-on-surface active:scale-95 transition-transform"
          >
            Lanjut edit
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-11 rounded-2xl px-4 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
            style={{ background: THEME.danger || THEME.primary }}
          >
            Buang
          </button>
        </div>
      </div>
    </div>
  )
}

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
  dirty = false,
}) {
  const backdropRef = useRef(null)
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)
  const wasOpenRef = useRef(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const customHeaderHasClose = header ? hasCloseControl(header) : false
  const customHeaderText = header ? getNodeText(header).trim() : ""
  const dialogName = ariaLabel || title || customHeaderText || "Dialog"
  const sharedCloseNeeded = Boolean(header ? !customHeaderHasClose : !title)

  const dismiss = dirty
    ? () => setConfirmingDiscard(true)
    : onClose

  useEffect(() => {
    if (!open || !closeOnEsc) return
    const onEsc = (e) => {
      if (e.key === "Escape") dismiss()
    }
    window.addEventListener("keydown", onEsc)
    return () => window.removeEventListener("keydown", onEsc)
  }, [open, closeOnEsc, dismiss])

  // Wave 5 modal history: register this sheet on the LIFO stack while open and
  // keep one history sentinel alive for as long as any sheet is open. A dirty
  // sheet answers a Back press by opening the discard confirmation (the pop is
  // re-pushed so the guard holds); a clean sheet closes and reports whether
  // another sheet still needs the guard.
  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined
    if (!sheetSentinelActive) {
      window.history.pushState({ __artamiSheetOpen: true }, "")
      sheetSentinelActive = true
    }
    const handleBack = () => {
      if (dirty) {
        setConfirmingDiscard(true)
        return true
      }
      onClose()
      // The pop belonged to this sheet's sentinel either way; the sentinel
      // re-push/unwind bookkeeping below keeps the guard consistent.
      return true
    }
    sheetStack.push(handleBack)
    return () => {
      const index = sheetStack.indexOf(handleBack)
      if (index >= 0) sheetStack.splice(index, 1)
      if (sheetStack.length === 0 && sheetSentinelActive) {
        if (isOurSentinel(window.history.state)) window.history.back()
        sheetSentinelActive = false
      }
    }
  }, [open, dirty, onClose])

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
        if (closeOnBackdrop && e.target === backdropRef.current) dismiss()
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
            {sharedCloseNeeded && <CloseButton onClose={dismiss} closeButtonRef={closeButtonRef} className={`absolute top-0 right-0 ${closeButtonClassName}`} />}
          </div>
        ) : title ? (
          <DefaultHeader
            title={title}
            subtitle={subtitle}
            onClose={dismiss}
            closeButtonRef={closeButtonRef}
            closeButtonClassName={closeButtonClassName}
          />
        ) : (
          <div className="mb-4 flex justify-end">
            <CloseButton onClose={dismiss} closeButtonRef={closeButtonRef} className={closeButtonClassName} />
          </div>
        )}
        {children}
        {footer && (
          <div className="mt-4 pt-4 border-t border-md3-outline-variant">{footer}</div>
        )}
      </div>
      {confirmingDiscard && (
        <SheetDiscardConfirm
          onCancel={() => setConfirmingDiscard(false)}
          onDiscard={() => {
            setConfirmingDiscard(false)
            onClose()
          }}
        />
      )}
    </div>,
    document.body
  )
}
