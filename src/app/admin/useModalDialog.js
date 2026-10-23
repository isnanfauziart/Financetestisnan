"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

// Shared stack so that when dialogs nest (e.g. payment proof opened over the
// user detail panel) only the topmost dialog answers Escape / Tab.
const dialogStack = []

/**
 * Gives a dialog surface the behaviour the admin workspace spec promises:
 * Escape closes it, Tab stays trapped inside it, focus starts inside it and
 * returns to the element that opened it. Attach the returned ref to the
 * element carrying role="dialog".
 */
export function useModalDialog({ open, onClose }) {
  const ref = useRef(null)
  const tokenRef = useRef(null)
  if (tokenRef.current === null) tokenRef.current = {}
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const node = ref.current
    if (!node) return undefined

    const token = tokenRef.current
    dialogStack.push(token)
    const previouslyFocused = document.activeElement

    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1")
    const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR))
    const initial = focusables()[0]
    ;(initial || node).focus()

    const handleKeyDown = (event) => {
      if (dialogStack[dialogStack.length - 1] !== token) return
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab") return
      const items = focusables()
      if (!items.length) {
        event.preventDefault()
        node.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!node.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      const index = dialogStack.indexOf(token)
      if (index >= 0) dialogStack.splice(index, 1)
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus()
    }
  }, [open ])

  return ref
}
