"use client"
import { useState, useEffect } from "react"
import { THEME, BILL_CATEGORIES, BILL_FREQUENCIES, BILL_TO_EXPENSE_MAP, BILL_TO_INCOME_MAP, EXPENSE_CATEGORIES, INCOME_CATEGORIES, BANK_ACCOUNTS } from "@/app/dashboard/_components/constants"
import { formatInputRupiah } from "@/app/dashboard/_components/helpers"
import Sheet from "@/app/dashboard/_components/Sheet"
import SelectField from "@/app/dashboard/_components/SelectField"

export default function BillSetupModal({ bill, onClose, onSaved }) {
  const isEdit = !!bill
  const [tipe, setTipe] = useState(bill?.tipe || "expense")
  const [nama, setNama] = useState(bill?.nama || "")
  const [jumlah, setJumlah] = useState(bill ? String(bill.jumlah) : "")
  const [rawJumlah, setRawJumlah] = useState(bill ? formatInputRupiah(String(bill.jumlah)) : "")
  const [kategoriBill, setKategoriBill] = useState(bill?.kategoriBill || "")
  const [kategoriTransaksi, setKategoriTransaksi] = useState(bill?.kategoriTransaksi || "")
  const [frekuensi, setFrekuensi] = useState(bill?.frekuensi || "monthly")
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState(bill?.tanggalJatuhTempo?.toString() || "")
  const [akunBank, setAkunBank] = useState(bill?.akunBank || "")
  const [catatan, setCatatan] = useState(bill?.catatan || "")
  const [saving, setSaving] = useState(false)

  const transactionCategories = tipe === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const autoMap = tipe === "income" ? BILL_TO_INCOME_MAP : BILL_TO_EXPENSE_MAP

  useEffect(() => {
    if (kategoriBill && autoMap[kategoriBill]) {
      setKategoriTransaksi(autoMap[kategoriBill])
    }
  }, [kategoriBill, tipe, autoMap])

  const handleSave = async () => {
    if (!nama.trim()) { return }
    const parsedJumlah = parseFloat(String(rawJumlah).replace(/\./g, ""))
    if (!parsedJumlah || parsedJumlah <= 0) { return }
    if (!kategoriBill) { return }
    if (!kategoriTransaksi) { return }
    if (!tanggalJatuhTempo) { return }

    setSaving(true)
    try {
      const url = isEdit ? `/api/bills/${bill.id}` : "/api/bills"
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          jumlah: parsedJumlah,
          tipe,
          kategoriBill,
          kategoriTransaksi,
          frekuensi,
          tanggalJatuhTempo: parseInt(tanggalJatuhTempo, 10),
          akunBank,
          catatan,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan")
      onSaved()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title={isEdit ? "Edit Tagihan" : "Tambah Tagihan"}
      subtitle={isEdit ? "Perbarui detail tagihan" : "Buat pengingat tagihan baru"}
      size="md"
      maxHeight="90vh"
    >
      <div className="space-y-4">
        {/* Tipe toggle */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Tipe</label>
          <div className="flex gap-2">
            {[
              { value: "expense", label: "Pengeluaran" },
              { value: "income", label: "Pemasukan" },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTipe(opt.value)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: tipe === opt.value ? (opt.value === "expense" ? THEME.expense : THEME.income) : THEME.surfaceWarm,
                  color: tipe === opt.value ? "white" : THEME.textSecondary,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nama */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Nama Tagihan</label>
          <input
            type="text"
            value={nama}
            onChange={e => setNama(e.target.value)}
            placeholder="Contoh: PLN Rumah"
            className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200"
            autoFocus
          />
        </div>

        {/* Jumlah */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Jumlah (Rp)</label>
          <input
            type="text"
            inputMode="numeric"
            value={rawJumlah}
            onChange={e => setRawJumlah(formatInputRupiah(e.target.value))}
            placeholder="0"
            className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200 font-semibold"
          />
        </div>

        {/* Kategori Bill */}
        <SelectField
          label="Kategori Tagihan"
          value={kategoriBill}
          onChange={setKategoriBill}
          options={BILL_CATEGORIES}
          placeholder="Pilih kategori"
        />

        {/* Kategori Transaksi (auto-mapped, editable) */}
        <SelectField
          label="Kategori Transaksi (otomatis)"
          value={kategoriTransaksi}
          onChange={setKategoriTransaksi}
          options={transactionCategories}
          placeholder="Pilih kategori transaksi"
        />

        {/* Frekuensi */}
        <SelectField
          label="Frekuensi"
          value={frekuensi}
          onChange={setFrekuensi}
          options={BILL_FREQUENCIES}
          placeholder="Pilih frekuensi"
        />

        {/* Tanggal Jatuh Tempo */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">
            {frekuensi === "weekly" || frekuensi === "biweekly" ? "Hari (1=Sen, 7=Min)" : "Tanggal (hari dalam bulan)"}
          </label>
          <input
            type="number"
            min={1}
            max={frekuensi === "weekly" || frekuensi === "biweekly" ? 7 : 31}
            value={tanggalJatuhTempo}
            onChange={e => setTanggalJatuhTempo(e.target.value)}
            placeholder={frekuensi === "weekly" || frekuensi === "biweekly" ? "1-7" : "1-31"}
            className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200"
          />
        </div>

        {/* Akun Bank */}
        <SelectField
          label="Akun Bank"
          value={akunBank}
          onChange={setAkunBank}
          options={["", ...BANK_ACCOUNTS]}
          placeholder="Pilih akun (opsional)"
        />

        {/* Catatan */}
        <div>
          <label className="text-[10px] font-bold text-earth-500 mb-1.5 block uppercase tracking-wider">Catatan</label>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Catatan tambahan..."
            rows={2}
            className="w-full px-4 py-3 rounded-2xl text-sm glass text-earth-800 outline-none focus:ring-2 focus:ring-violet-200 resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !nama.trim() || !rawJumlah || !kategoriBill || !kategoriTransaksi || !tanggalJatuhTempo}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
          style={{ background: saving ? "#ccc" : THEME.primary }}
        >
          {saving ? "Menyimpan..." : isEdit ? "Perbarui Tagihan" : "Simpan Tagihan"}
        </button>
      </div>
    </Sheet>
  )
}
