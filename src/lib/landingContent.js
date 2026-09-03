export const NAV_ITEMS = Object.freeze([
  { label: "Produk", href: "#produk" },
  { label: "Kecerdasan", href: "#kecerdasan" },
  { label: "Privasi", href: "#privasi" },
  { label: "Harga", href: "#harga" },
  { label: "FAQ", href: "#faq" },
])

export const DATA_OWNERSHIP = Object.freeze({
  headline: "Datamu, tetap milikmu.",
  description:
    "Catatan tetap tersimpan di Google Sheet milikmu—bukan disalin ke database transaksi Artami.",
})

export const FEATURES = Object.freeze([
  {
    id: "health-score",
    title: "Financial Health Score",
    description: "Baca kondisi keuanganmu dalam satu skor yang menjelaskan apa yang sudah kuat dan apa yang perlu dirapikan.",
  },
  {
    id: "transaction-heatmap",
    title: "Heatmap transaksi",
    description: "Kenali ritme transaksi harianmu dalam satu bulan dan lihat kapan aktivitas paling padat.",
  },
  {
    id: "anomaly-alerts",
    title: "Peringatan pengeluaran tidak biasa",
    description: "Temukan lonjakan belanja sebelum pola kecil berubah menjadi kebiasaan mahal.",
  },
  {
    id: "monthly-budgets",
    title: "Budget bulanan",
    description: "Tetapkan batas per kategori dan ukur ruang belanja yang masih tersedia dengan jelas.",
  },
])

export const EVENT_BUDGETS = Object.freeze([
  {
    id: "sekolah",
    name: "Anak Masuk Sekolah",
    meta: "Contoh · 12 hari lagi",
    status: "Aktif",
    date: "1 Juli – 15 Juli 2026 (contoh)",
    progress: 68,
    spent: "Rp5.440.000",
    target: "Rp8.000.000",
    remaining: "Rp2.560.000",
    remainingDetail: "untuk 3 kebutuhan",
    categories: [
      { name: "Uang pangkal", amount: "Rp3,5 jt / Rp4 jt", progress: 88 },
      { name: "Seragam & buku", amount: "Rp1,2 jt / Rp2 jt", progress: 60 },
      { name: "Perlengkapan", amount: "Rp740 rb / Rp2 jt", progress: 37 },
    ],
  },
  {
    id: "lebaran",
    name: "THR / Lebaran",
    meta: "Perencanaan",
    status: "Direncanakan",
    date: "20 Maret 2027",
    progress: 63,
    spent: "Rp6.250.000",
    target: "Rp10.000.000",
    remaining: "Rp3.750.000",
    remainingDetail: "untuk 3 kebutuhan",
    categories: [
      { name: "Mudik", amount: "Rp3 jt / Rp4 jt", progress: 75 },
      { name: "THR keluarga", amount: "Rp2,5 jt / Rp3,5 jt", progress: 71 },
      { name: "Hidangan", amount: "Rp750 rb / Rp2,5 jt", progress: 30 },
    ],
  },
  {
    id: "keluarga",
    name: "Acara Keluarga",
    meta: "Bisa dikustom",
    status: "Disiapkan",
    date: "17 Agustus 2026",
    progress: 68,
    spent: "Rp3.400.000",
    target: "Rp5.000.000",
    remaining: "Rp1.600.000",
    remainingDetail: "untuk 3 kebutuhan",
    categories: [
      { name: "Tempat & konsumsi", amount: "Rp2 jt / Rp2,8 jt", progress: 71 },
      { name: "Transportasi", amount: "Rp850 rb / Rp1,2 jt", progress: 71 },
      { name: "Dokumentasi", amount: "Rp550 rb / Rp1 jt", progress: 55 },
    ],
  },
])

export const PRICING_PLANS = Object.freeze([
  {
    id: "gratis",
    name: "Gratis",
    price: "Rp0",
    detail: "75 transaksi/bulan, riwayat 4 bulan, 3 budget, 1 tujuan, dan 3 insight per minggu.",
  },
  {
    id: "lifetime",
    name: "Artami Pro",
    price: "Rp40.000",
    detail: "Sekali bayar untuk akses tanpa batas serta Financial Health Score, proyeksi arus kas, dan peringatan anomali.",
    emphasis: "Sekali bayar. Tanpa tagihan berulang.",
  },
])

export const SCENARIOS = Object.freeze([
  {
    id: "kurangi-jajan",
    adjustment: "Kurangi Jajan Rp300.000/bulan",
    outcome: "Target beli HP baru dapat tercapai lebih cepat tanpa mengubah pemasukanmu.",
  },
  {
    id: "tambah-penghasilan",
    adjustment: "Tambah penghasilan Rp1.000.000/bulan",
    outcome: "Tambahan arus kas langsung memperbesar setoran menuju HP baru.",
  },
])

export const FAQ_ITEMS = Object.freeze([
  {
    id: "data-aman",
    question: "Apakah data keuangan saya aman?",
    answer:
      "Aman. Catatan transaksi tersimpan di Google Sheet milikmu sendiri, bukan di database Artami. Artami hanya mendapat izin terbatas pada file yang kamu pilih, dan kamu bisa mencabut izin itu kapan saja dari akun Google-mu.",
  },
  {
    id: "izin-google",
    question: "Kenapa Artami meminta izin Google?",
    answer:
      "Izin dibutuhkan supaya Artami bisa membaca dan menulis catatan di Sheet milikmu saat fitur digunakan. Cakupannya terbatas pada file yang kamu izinkan (drive.file), bukan seluruh Google Drive-mu.",
  },
  {
    id: "bank",
    question: "Apakah saya perlu menghubungkan rekening bank?",
    answer:
      "Tidak perlu. Artami tidak pernah meminta kredensial rekening atau e-wallet. Kamu mencatat transaksi sendiri, dan Artami yang merapikannya menjadi insight.",
  },
  {
    id: "berhenti",
    question: "Apa yang terjadi dengan data saya jika saya berhenti pakai?",
    answer:
      "Tidak ada yang berubah. Sheet tetap milikmu dan bisa kamu buka langsung di Google Sheets. Data tidak ikut terhapus saat akun Artami tidak lagi digunakan.",
  },
  {
    id: "upgrade",
    question: "Bagaimana cara upgrade ke Artami Pro?",
    answer:
      "Bayar sekali Rp40.000 lewat QRIS, lalu unggah bukti pembayaran. Setelah diverifikasi, semua fitur Pro langsung aktif tanpa tagihan berulang.",
  },
  {
    id: "nasihat",
    question: "Apakah Artami memberi nasihat keuangan?",
    answer:
      "Bukan. Insight, proyeksi, dan simulasi di Artami bersifat ilustratif berdasarkan catatanmu - bukan nasihat keuangan profesional.",
  },
  {
    id: "android",
    question: "Kapan aplikasi Android tersedia?",
    answer:
      "Aplikasi Android sedang dipersiapkan untuk Play Store. Untuk sekarang, Artami bisa dipakai langsung lewat browser.",
  },
])
