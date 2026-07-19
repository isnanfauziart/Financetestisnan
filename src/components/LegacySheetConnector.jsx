"use client"

import { useCallback, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, Table2 } from "lucide-react"

const PICKER_SCOPE = "https://www.googleapis.com/auth/drive.file"
const SHEETS_MIME_TYPE = "application/vnd.google-apps.spreadsheet"

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener("load", resolve, { once: true })
      existing.addEventListener("error", reject, { once: true })
      if (existing.dataset.loaded === "true") resolve()
      return
    }

    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => {
      script.dataset.loaded = "true"
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function loadPickerApi() {
  return new Promise((resolve) => {
    window.gapi.load("picker", resolve)
  })
}

export default function LegacySheetConnector({ userName, onConnected, onSignOut }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const connectSheet = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const developerKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY
    const appId = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER

    if (!clientId || !developerKey || !appId) {
      setError("Env Google Picker belum lengkap. Isi NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_PICKER_API_KEY, dan NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER.")
      return
    }

    setBusy(true)
    setError("")
    setMessage("Membuka Google Picker...")

    try {
      await Promise.all([
        loadScript("https://apis.google.com/js/api.js"),
        loadScript("https://accounts.google.com/gsi/client"),
      ])
      await loadPickerApi()

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: PICKER_SCOPE,
        callback: async (tokenResponse) => {
          if (!tokenResponse?.access_token) {
            setBusy(false)
            setError("Google tidak mengembalikan akses file.")
            return
          }

          const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
            .setMimeTypes(SHEETS_MIME_TYPE)
            .setSelectFolderEnabled(false)

          const picker = new window.google.picker.PickerBuilder()
            .setAppId(appId)
            .setOAuthToken(tokenResponse.access_token)
            .setDeveloperKey(developerKey)
            .addView(view)
            .setCallback(async (pickerData) => {
              if (pickerData.action === window.google.picker.Action.CANCEL) {
                setBusy(false)
                setMessage("")
                return
              }

              if (pickerData.action !== window.google.picker.Action.PICKED) return

              const spreadsheetId = pickerData.docs?.[0]?.id
              if (!spreadsheetId) {
                setBusy(false)
                setError("Spreadsheet tidak ditemukan dari Google Picker.")
                return
              }

              setMessage("Menghubungkan spreadsheet lama...")
              try {
                const res = await fetch("/api/account/connect-legacy-sheet", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ spreadsheetId }),
                })
                const result = await res.json()
                if (!res.ok) {
                  throw new Error(result.error || "Gagal menghubungkan spreadsheet")
                }

                setMessage("Spreadsheet berhasil terhubung.")
                onConnected?.()
              } catch (err) {
                setError(err.message)
              } finally {
                setBusy(false)
              }
            })
            .build()

          picker.setVisible(true)
        },
      })

      tokenClient.requestAccessToken({ prompt: "consent" })
    } catch (err) {
      setError(err.message || "Gagal memuat Google Picker.")
      setBusy(false)
    }
  }, [onConnected])

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-organic text-earth-800">
      <div className="glass-strong rounded-[32px] p-7 max-w-sm w-full">
        <div className="w-14 h-14 rounded-2xl mesh-violet shadow-pop flex items-center justify-center mb-5">
          <Table2 size={24} className="text-white" aria-hidden="true" />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-earth-500 mb-2">
          Owner setup
        </p>
        <h1 className="text-2xl font-display font-bold text-earth-900 leading-tight mb-3">
          Hubungkan spreadsheet Artami lama
        </h1>
        <p className="text-sm text-earth-600 leading-relaxed mb-6">
          Halo{userName ? `, ${userName.split(" ")[0]}` : ""}. Akun ini memakai spreadsheet pribadi yang sudah ada. Pilih file lama sekali saja, lalu Artami akan memakai file itu untuk dashboard ini.
        </p>

        {error && (
          <div className="flex gap-2 rounded-2xl bg-rose-50 text-rose-600 p-3 text-xs font-semibold mb-4">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {message && !error && (
          <div className="flex gap-2 rounded-2xl bg-moss-50 text-moss-700 p-3 text-xs font-semibold mb-4">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}

        <button
          onClick={connectSheet}
          disabled={busy}
          className="w-full py-3.5 rounded-2xl text-white font-semibold mesh-violet shadow-pop active:scale-95 transition-transform disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {busy ? "Memproses..." : "Pilih Spreadsheet Lama"}
        </button>

        <button
          onClick={onSignOut}
          disabled={busy}
          className="w-full py-3.5 rounded-2xl text-earth-500 font-semibold bg-earth-50 active:scale-95 transition-transform mt-3 disabled:opacity-60"
        >
          Keluar
        </button>
      </div>
    </div>
  )
}
