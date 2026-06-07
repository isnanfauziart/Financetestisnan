"use client"
import { Plus } from "lucide-react"
import { THEME, EXPENSE_CATEGORIES, INCOME_CATEGORIES, SAVINGS_CATEGORIES, BANK_ACCOUNTS } from "./_components/constants"
import { formatInputRupiah } from "./_components/helpers"
import SelectField from "./_components/SelectField"

export default function WalletTab({ txType, formData, rawAmount, submitting, setTxType, setFormData, setRawAmount, handleSubmit }) {
  return (
    <div className="px-5 pt-4 animate-bento-in" key="wallet-tab">
      <div className="bento-tile bg-white border border-earth-100 p-5 shadow-warm">
        <div className="flex gap-2 mb-5 p-1.5 rounded-2xl" style={{ background: THEME.surfaceWarm }}>
          <button onClick={() => { setTxType("expense"); setFormData(f => ({ ...f, kategori: "" })) }} aria-label="Switch to expense form" aria-pressed={txType === "expense"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "expense" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Expense
          </button>
          <button onClick={() => { setTxType("income"); setFormData(f => ({ ...f, kategori: "" })) }} aria-label="Switch to income form" aria-pressed={txType === "income"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "income" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Income
          </button>
          <button onClick={() => { setTxType("savings"); setFormData(f => ({ ...f, kategori: "" })) }} aria-label="Switch to savings form" aria-pressed={txType === "savings"}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${txType === "savings" ? "bg-white text-earth-800 shadow-warm" : "text-earth-500"}`}>
            Tabungan
          </button>
        </div>

        <div className="text-center mb-6 mt-2">
          <p className="text-[10px] font-bold text-earth-500 uppercase tracking-wider mb-2">Amount</p>
          <h2 className="text-4xl font-display font-bold" style={{ color: txType === "expense" ? THEME.textPrimary : txType === "savings" ? THEME.savings : THEME.income }}>
            {rawAmount ? `Rp ${rawAmount}` : "Rp 0"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="amount-input" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Amount</label>
              <input id="amount-input" type="text" inputMode="numeric" placeholder="0" value={rawAmount} onChange={e => setRawAmount(formatInputRupiah(e.target.value))} aria-label="Transaction amount"
                className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-200 transition-shadow" />
            </div>
            <div>
              <label htmlFor="date-input" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Date</label>
              <input id="date-input" type="date" value={formData.tanggal} onChange={e => setFormData(f => ({ ...f, tanggal: e.target.value }))} aria-label="Transaction date"
                className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-semibold outline-none" />
            </div>
          </div>
          <SelectField label="Category" value={formData.kategori} onChange={v => setFormData(f => ({ ...f, kategori: v }))}
            options={txType === "expense" ? EXPENSE_CATEGORIES : txType === "savings" ? SAVINGS_CATEGORIES : INCOME_CATEGORIES} placeholder="Select Category" />
          <SelectField label="Bank Account" value={formData.akunBank} onChange={v => setFormData(f => ({ ...f, akunBank: v }))}
            options={BANK_ACCOUNTS} placeholder="Select Bank" />
          <div>
            <label htmlFor="note-input" className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Note</label>
            <input id="note-input" type="text" placeholder="Description..." value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))} aria-label="Transaction note"
              className="w-full px-4 py-3 bg-earth-50 border border-earth-100 rounded-2xl text-sm font-medium outline-none" />
          </div>
          <button type="submit" disabled={submitting} aria-label="Save transaction"
            className="w-full py-4 mt-2 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-pop transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
            style={{ background: submitting ? "#ccc" : "linear-gradient(135deg, #4a3d33, #7c5fcf)" }}>
            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Plus size={18} aria-hidden="true" /> Save Transaction</>}
          </button>
        </form>
      </div>
    </div>
  )
}
