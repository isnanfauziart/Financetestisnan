"use client"

import { Menu, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function Navigation({ items, links }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const hasPlayStoreLink = Boolean(links.playStore)
  const closeMobileNavigation = () => {
    setIsOpen(false)
    menuButtonRef.current?.focus()
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [isOpen])

  return (
    <header className="site-header navigation">
      <a className="wordmark" href="#awal" aria-label="Artami, kembali ke awal">
        Artami
      </a>

      <nav className="desktop-nav" aria-label="Navigasi utama">
        {items.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="navigation__actions">
        <a className="button button--compact" href={links.webApp}>
          Buka Artami
        </a>
        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span className="sr-only">{isOpen ? "Tutup navigasi" : "Buka navigasi"}</span>
        </button>
      </div>

      <div className="mobile-navigation" id="mobile-navigation" hidden={!isOpen}>
        <nav aria-label="Navigasi utama">
          {items.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMobileNavigation}>
              {item.label}
            </a>
          ))}
          {hasPlayStoreLink ? (
            <a href={links.playStore} onClick={closeMobileNavigation}>Dapatkan di Play Store</a>
          ) : (
            <p className="navigation__store-status" aria-disabled="true">Segera hadir di Play Store</p>
          )}
        </nav>
      </div>
    </header>
  )
}
