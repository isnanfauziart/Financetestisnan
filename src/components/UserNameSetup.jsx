"use client"

import { useEffect, useState } from "react"
import Sheet from "@/app/dashboard/_components/Sheet"
import { THEME } from "@/app/dashboard/_components/constants"

const MAX_NAME_LENGTH = 60

function NameFields({ mode, value, error, submitting, onChange, onSave, onDismiss }) {
  const inputId = `user-name-${mode}`
  const errorId = `${inputId}-error`
  const isPrompt = mode === "prompt"

  return (
    <form onSubmit={onSave} className="space-y-3">
      <div>
        <label htmlFor={inputId} className="text-[10px] font-bold text-md3-on-surface-variant mb-1.5 block uppercase tracking-wider">
          Nama pengguna
        </label>
        <input
          id={inputId}
          type="text"
          value={value}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="name"
          onChange={onChange}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          className="w-full px-4 py-3 bg-md3-surface border border-md3-outline-variant rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200"
        />
        <p className="text-[10px] text-earth-400 mt-1 px-1">Opsional, maksimal 60 karakter.</p>
      </div>

      {error && <p id={errorId} role="alert" className="text-xs text-rose-500 font-semibold">{error}</p>}

      <div className={isPrompt ? "flex gap-2" : ""}>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-2xl font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: submitting ? "#ccc" : THEME.primary }}
        >
          {submitting ? "Menyimpan..." : "Simpan"}
        </button>
        {isPrompt && (
          <button
            type="button"
            onClick={onDismiss}
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-md3-surface-container-high text-md3-on-surface-variant font-bold transition-all active:scale-[0.97] disabled:opacity-50"
          >
            Nanti
          </button>
        )}
      </div>
    </form>
  )
}

export default function UserNameSetup({
  initialValue = "",
  open,
  onClose,
  onSaved,
  onDismissed,
  mode = "prompt",
}) {
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const isPrompt = mode === "prompt"

  useEffect(() => {
    if (!open) return
    setValue(String(initialValue || ""))
    setError("")
  }, [open, initialValue])

  const persist = async (updates, afterSave) => {
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan nama")
    } catch (err) {
      setError(err.message || "Gagal menyimpan nama")
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    afterSave?.()
    onClose?.()
  }

  const handleSave = (event) => {
    event.preventDefault()
    const trimmedValue = value.trim()
    const updates = trimmedValue
      ? [["userName", trimmedValue], ["userNamePromptDismissed", true]]
      : [["userName", ""], ["userNamePromptDismissed", false]]

    persist(updates, () => onSaved?.(trimmedValue))
  }

  const handleDismiss = () => {
    persist([["userNamePromptDismissed", true]], onDismissed)
  }

  const fields = (
    <NameFields
      mode={mode}
      value={value}
      error={error}
      submitting={submitting}
      onChange={(event) => setValue(event.target.value)}
      onSave={handleSave}
      onDismiss={handleDismiss}
    />
  )

  if (!open) return null

  if (!isPrompt) {
    return <div className="border-t border-md3-outline-variant pt-3">{fields}</div>
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Atur nama pengguna"
      subtitle="Personalisasi Artami"
      size="sm"
      closeOnBackdrop={false}
      closeOnEsc={false}
    >
      <p className="text-sm leading-relaxed text-md3-on-surface-variant mb-4">
        Gunakan nama pilihanmu di Artami. Nama ini tersimpan di Google Sheets milikmu dan bisa dikosongkan kapan saja.
      </p>
      {fields}
    </Sheet>
  )
}
