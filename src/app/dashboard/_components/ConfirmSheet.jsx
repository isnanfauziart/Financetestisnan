"use client"
import { Trash2, X } from "lucide-react"
import { THEME } from "./constants"

export default function ConfirmSheet({
  title = "Konfirmasi",
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  confirmColor = THEME.danger,
  onConfirm,
  onClose,
  confirming = false,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(42,32,24,0.5)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass-strong rounded-t-[32px] sm:rounded-[32px] p-6 shadow-pop-lg w-full max-w-md animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: confirmColor + "18", color: confirmColor }}
          >
            <Trash2 size={20} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-display font-bold text-earth-800">{title}</h3>
            {message && <p className="text-sm text-earth-600 mt-1 leading-relaxed">{message}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={confirming}
            aria-label="Close confirm"
            className="w-8 h-8 rounded-full bg-earth-50 hover:bg-earth-100 transition-colors flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          >
            <X size={14} color={THEME.textSecondary} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            disabled={confirming}
            className="flex-1 py-3.5 rounded-2xl font-semibold text-earth-700 bg-earth-50 hover:bg-earth-100 active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 py-3.5 rounded-2xl font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: confirming ? "#ccc" : confirmColor }}
          >
            {confirming ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
