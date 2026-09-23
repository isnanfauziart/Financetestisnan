"use client"
import { useEffect, useRef, useState } from "react"
import { CheckCircle2, PiggyBank, Receipt, Wallet } from "lucide-react"
import { THEME } from "./constants"
import { formatInputRupiah, formatRpFull } from "./helpers"
import QuickAddSheet from "./QuickAddSheet"

const noop = () => {}

/**
 * Wave 4 — Required guided first use.
 *
 * Three render modes:
 * - `step="balance"` and `step="transaction"`: required steps. The spotlight
 *   shell replaces the dashboard, cannot be dismissed (Escape, backdrop,
 *   browser Back, refresh, reopen all resume instead of bypass), and entered
 *   values survive every error.
 * - `step="optional"`: both required outcomes committed; budget/goal setup is
 *   offered as an optional next step and can be skipped.
 */
export default function OnboardingOverlay({
  step,
  specialSuggestion,
  transactionUsage,
  proRegistrationOpen,
  transactions,
  onBalanceSaved,
  onFirstTransactionSaved,
  onOpenPlan,
  onFinish,
  showToast,
  submitTransaction,
}) {
  // ─── Step 1: combined opening balance (required, Rp0 valid) ───
  const [rawAmount, setRawAmount] = useState("")
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().split("T")[0])
  const [savingBalance, setSavingBalance] = useState(false)
  const [balanceError, setBalanceError] = useState(null)

  // ─── Step 2: first transaction (required) ───
  const [firstTxOpen, setFirstTxOpen] = useState(false)
  const firstTxOpenedRef = useRef(false)

  useEffect(() => {
    if (step !== "transaction" || firstTxOpenedRef.current) return
    firstTxOpenedRef.current = true
    setFirstTxOpen(true)
  }, [step])

  if (step === "transaction" && !firstTxOpen) {
    return (
      <Shell>
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: THEME.savingsBg }} aria-hidden="true">
            <Receipt size={24} color={THEME.savings} />
          </span>
          <h2 className="font-display text-xl font-bold text-md3-on-surface">Saldo awal tersimpan ✓</h2>
          <p className="mt-2 text-sm leading-relaxed text-md3-on-surface-variant">
            Satu langkah lagi: catat transaksi pertamamu. Pencatatanmu dimulai dari sini.
          </p>
          <button
            type="button"
            onClick={() => setFirstTxOpen(true)}
            className="mt-6 w-full rounded-2xl py-3.5 font-bold text-white shadow-pop transition-transform active:scale-95"
            style={{ background: THEME.primary }}
          >
            Catat transaksi pertama
          </button>
        </div>
      </Shell>
    )
  }

  if (step === "transaction") {
    return (
      <Shell dimmed>
        <QuickAddSheet
          open={firstTxOpen}
          onClose={() => {
            // The required step cannot be bypassed by closing Quick Add; the
            // interstitial re-opens it so the first transaction stays required.
            setFirstTxOpen(false)
          }}
          initialType="expense"
          onSubmit={async payload => {
            const result = await submitTransaction(payload)
            if (result?.ok) {
              setFirstTxOpen(false)
              onFirstTransactionSaved()
            }
            return result
          }}
          onGoalContribute={noop}
          transactionUsage={transactionUsage}
          proRegistrationOpen={proRegistrationOpen}
          specialSuggestion={specialSuggestion}
          transactions={transactions}
        />
      </Shell>
    )
  }

  if (step === "optional") {
    return (
      <Shell>
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: THEME.savingsBg }} aria-hidden="true">
            <CheckCircle2 size={24} color={THEME.savings} />
          </span>
          <h2 className="font-display text-xl font-bold text-md3-on-surface">Semua siap! 🎉</h2>
          <p className="mt-2 text-sm leading-relaxed text-md3-on-surface-variant">
            Saldo awal dan transaksi pertamamu sudah tersimpan. Kalau mau, atur budget atau target — atau langsung mulai.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenPlan("budget")}
              className="min-h-11 rounded-2xl bg-md3-surface-container-high px-3 text-sm font-bold text-md3-on-surface transition-transform active:scale-95"
            >
              Atur budget
            </button>
            <button
              type="button"
              onClick={() => onOpenPlan("goal")}
              className="min-h-11 rounded-2xl bg-md3-surface-container-high px-3 text-sm font-bold text-md3-on-surface transition-transform active:scale-95"
            >
              Buat target
            </button>
          </div>
          <button
            type="button"
            onClick={onFinish}
            className="mt-3 w-full rounded-2xl py-3.5 font-bold text-white shadow-pop transition-transform active:scale-95"
            style={{ background: THEME.primary }}
          >
            Mulai pakai Artami
          </button>
        </div>
      </Shell>
    )
  }

  // ─── step === "balance" ───
  const parsedAmount = parseBalanceInput(rawAmount)

  function handleSubmitBalance(event) {
    event.preventDefault()
    if (savingBalance) return
    if (rawAmount.trim() === "") {
      setBalanceError("Masukkan jumlah saldo awal, atau 0 kalau kamu mulai dari nol.")
      return
    }
    if (parsedAmount === null) {
      setBalanceError("Format saldo awal tidak valid.")
      return
    }
    if (!dateValue) {
      setBalanceError("Masukkan tanggal saldo awal.")
      return
    }
    setSavingBalance(true)
    setBalanceError(null)
    Promise.resolve(
      onBalanceSaved({ amount: parsedAmount, date: dateValue }),
    )
      .then(result => {
        if (result?.ok) return
        // Values stay in the inputs so the user can retry without retyping.
        setBalanceError(result?.error || "Gagal menyimpan. Coba lagi.")
      })
      .catch(() => setBalanceError("Gagal menyimpan. Coba lagi."))
      .finally(() => setSavingBalance(false))
  }

  return (
    <Shell>
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: THEME.primaryBg }} aria-hidden="true">
          <Wallet size={24} color={THEME.primary} />
        </span>
        <h2 className="font-display text-xl font-bold text-md3-on-surface">Selamat datang di Artami 👋</h2>
        <p className="mt-2 text-sm leading-relaxed text-md3-on-surface-variant">
          Sebelum mulai, konfirmasi dulu saldo awalmu — total uang yang kamu miliki hari ini sebelum transaksi pertama.
        </p>

        <form onSubmit={handleSubmitBalance} className="mt-5 space-y-3 text-left">
          <div>
            <label htmlFor="onboarding-balance-amount" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">
              Total saldo awal (Rp)
            </label>
            <input
              id="onboarding-balance-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={rawAmount}
              onChange={event => setRawAmount(formatInputRupiah(event.target.value))}
              aria-invalid={balanceError ? "true" : undefined}
              aria-describedby={balanceError ? "onboarding-balance-error" : "onboarding-balance-hint"}
              className="field-outlined w-full px-4 py-3 text-sm font-semibold"
              autoFocus
            />
            {rawAmount !== "" && parsedAmount !== null && (
              <p className="mt-1 px-1 text-[10px] text-md3-on-surface-variant">{formatRpFull(parsedAmount)}</p>
            )}
            <p id="onboarding-balance-hint" className="mt-1 px-1 text-[10px] text-earth-400">
              Ketik 0 kalau kamu mulai dari nol — nol juga disimpan.
            </p>
          </div>

          <div>
            <label htmlFor="onboarding-balance-date" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-md3-on-surface-variant">
              Tanggal
            </label>
            <input
              id="onboarding-balance-date"
              type="date"
              value={dateValue}
              onChange={event => setDateValue(event.target.value)}
              className="field-outlined w-full px-4 py-3 text-sm font-semibold"
            />
            <p className="mt-1 px-1 text-[10px] text-earth-400">
              Hanya transaksi setelah tanggal ini yang mempengaruhi saldo dan kekayaan bersih.
            </p>
          </div>

          {balanceError && (
            <p id="onboarding-balance-error" role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {balanceError}
            </p>
          )}

          <p className="rounded-xl px-3 py-2 text-[10px] leading-relaxed text-md3-on-surface-variant" style={{ background: THEME.surfaceWarm }}>
            Transaksi pertamamu tidak dihitung dua kali: saldo awal adalah kondisi sebelum transaksi itu ada.
          </p>

          <button
            type="submit"
            disabled={savingBalance}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white shadow-pop transition-[background-color,opacity,transform] duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: savingBalance ? "#ccc" : THEME.primary }}
          >
            {savingBalance ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
            ) : (
              <>
                <PiggyBank size={16} aria-hidden="true" /> Simpan saldo awal
              </>
            )}
          </button>
        </form>
      </div>
    </Shell>
  )
}

/**
 * Required-step spotlight shell. A dimmed backdrop covers the whole dashboard
 * (nothing behind it is interactive), the card is centered and stays above the
 * mobile keyboard because it top-aligns within the viewport; no fixed pixel
 * coordinates are used anywhere, so focus or layout changes never detach the
 * spotlight from the control it describes. Reduced motion simply has no
 * animation — nothing else changes.
 */
function Shell({ dimmed = false, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-[12vh]"
      style={{ background: dimmed ? "rgba(42,32,24,0.5)" : "rgba(251,248,242,0.97)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Panduan pertama kali"
    >
      <div className="glass-strong my-auto flex w-full flex-col items-center rounded-[32px] p-6 shadow-pop-lg">
        {children}
      </div>
    </div>
  )
}

function parseBalanceInput(raw) {
  if (raw.trim() === "") return null
  const cleaned = raw.replace(/\./g, "").replace(/,/g, ".")
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === ".") return null
  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}
