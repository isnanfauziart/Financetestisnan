// Static content for the in-app "Panduan" (Docs) hub on the Profile tab.
// Pure JS so it can be shared with the future React Native app unchanged.

export const DOCS_GROUPS = Object.freeze([
  { id: "istilah", title: "Istilah" },
  { id: "fitur", title: "Cara kerja fitur" },
  { id: "data", title: "Data & privasi" },
  { id: "free-pro", title: "Free & Pro" },
])

export const DOCS_TOPICS = Object.freeze([
  {
    id: "rutin-spesial",
    groupId: "istilah",
    title: "Pengeluaran Rutin & Spesial",
    summary: "Bedakan pengeluaran harian dan pengeluaran besar yang tidak rutin.",
    body: [
      "Setiap pengeluaran bisa ditandai sebagai Rutin atau Spesial. Rutin adalah pengeluaran yang berulang, seperti makan, transportasi, dan tagihan. Spesial adalah pengeluaran besar yang tidak terjadi setiap bulan, misalnya laptop baru, biaya kondangan, atau perbaikan motor.",
    ],
    bullets: [
      "Spesial tetap dihitung penuh di saldo, kekayaan bersih, anggaran, kuota transaksi, dan kalender.",
      "Tren bulanan, rata-rata, prediksi cash flow, anomaly alerts, sebagian faktor Health Score, dan insight tidak memasukkan Spesial, supaya pola keuanganmu tetap terbaca.",
    ],
    example:
      "Kamu beli laptop Rp10.000.000 di bulan yang biasanya pengeluarannya Rp3.000.000. Tanpa penanda Spesial, trenmu terlihat melonjak drastis. Dengan Spesial, saldo dan anggaran tetap tercatat, tapi tren dan prediksi tetap tenang.",
  },
  {
    id: "net-worth",
    groupId: "istilah",
    title: "Net Worth (Kekayaan Bersih)",
    summary: "Selisih seluruh harta dan utangmu, dihitung dari catatan transaksimu.",
    body: [
      "Net Worth adalah kekayaan bersih: seluruh pemasukan ditambah tabungan dan Saldo Awal, dikurangi seluruh pengeluaran dan utang. Angka ini dihitung langsung dari catatan di spreadsheet-mu, termasuk pengeluaran Spesial.",
    ],
    bullets: [
      "Grafik riwayat net worth menunjukkan perkembangannya dari bulan ke bulan.",
      "Saldo Awal yang akurat membuat net worth sejak awal tercatat benar.",
    ],
  },
  {
    id: "event-budget",
    groupId: "istilah",
    title: "Event Budget (Momental)",
    summary: "Anggaran khusus untuk acara seperti pernikahan atau wisuda.",
    body: [
      "Event Budget adalah anggaran terpisah untuk acara tertentu, misalnya pernikahan, wisuda, atau mudik. Transaksi yang terkait acara diberi penanda event, sehingga pengeluaran acara tidak tercampur dengan pengeluaran bulanan biasa.",
    ],
    bullets: [
      "Setiap event punya sub-kategori sendiri, misalnya katering, dekorasi, atau perlengkapan.",
      "Total pengeluaran event tetap masuk ke saldo, anggaran, dan catatan bulanan seperti pengeluaran biasa.",
    ],
  },
  {
    id: "utang-piutang",
    groupId: "istilah",
    title: "Utang & Piutang",
    summary: "Catat utang yang kamu terima dan pinjaman yang kamu berikan.",
    body: [
      "Fitur Utang & Piutang mencatat pinjaman dua arah: utang yang kamu terima dan piutang yang kamu berikan ke orang lain. Setiap catatan punya status, dan pembayarannya bisa dicatat langsung dari daftar supaya catatanmu tetap akurat.",
    ],
    example:
      "Kamu meminjamkan Rp500.000 ke teman. Catat sebagai piutang; saat temanmu membayar kembali, catat pembayarannya dari daftar piutang.",
  },
  {
    id: "saldo-awal",
    groupId: "istilah",
    title: "Saldo Awal",
    summary: "Titik nol saldo kamu saat mulai memakai Artami.",
    body: [
      "Saldo Awal adalah jumlah uang yang kamu miliki pada tanggal kamu mulai mencatat, sebelum transaksi apa pun di Artami. Angka ini menjadi titik awal perhitungan saldo dan net worth.",
    ],
    bullets: [
      "Ubah Saldo Awal kapan saja di tab Profil, bagian Data & akun.",
      "Kalau kamu sudah punya uang sebelum mulai mencatat, masukkan jumlahnya agar saldo dan kekayaan bersihmu akurat.",
    ],
  },
  {
    id: "health-score",
    groupId: "fitur",
    title: "Health Score",
    tag: "Pro",
    summary: "Ringkasan kesehatan keuanganmu dalam satu angka.",
    body: [
      "Health Score merangkum kesehatan keuanganmu dalam satu angka dengan penilaian huruf supaya mudah dipahami. Skor dihitung dari data transaksi aslimu, bukan perkiraan umum.",
    ],
    bullets: [
      "Perhitungan menggunakan pengeluaran rutin; pengeluaran Spesial tidak mengganggu skormu.",
      "Untuk melihat faktor yang dipakai dalam perhitungan, buka kartu Health Score di Beranda lalu ketuk penjelasan rumusnya.",
    ],
  },
  {
    id: "financial-independence",
    groupId: "fitur",
    title: "Financial Independence",
    tag: "Pro",
    summary: "Progresmu menuju kebebasan finansial, dihitung dengan aturan 4%.",
    body: [
      "Financial Independence (FI) mengukur seberapa dekat kekayaan bersihmu dengan angka patokan kebebasan finansial: sekitar 25 kali pengeluaran tahunanmu, dikenal sebagai aturan 4%. Dari angka itu, Artami memperkirakan progres dan waktu menuju target.",
    ],
    bullets: [
      "FI adalah estimasi edukatif, bukan kepastian; asumsi pasar dan kehidupan bisa berubah.",
      "Pengeluaran Spesial tidak masuk dalam baseline perhitungan, sehingga target tidak terdistorsi pengeluaran besar sekali beli.",
    ],
  },
  {
    id: "forecast-anomaly",
    groupId: "fitur",
    title: "Cash Flow Forecast & Anomaly Alerts",
    tag: "Pro",
    summary: "Prediksi tiga bulan ke depan dan peringatan pengeluaran tidak wajar.",
    body: [
      "Cash Flow Forecast memproyeksikan pemasukan dan pengeluaran rutinmu untuk tiga bulan ke depan berdasarkan pola historis di spreadsheet-mu. Anomaly Alerts memberi peringatan ketika ada pengeluaran rutin yang menyimpang jauh dari pola biasa.",
    ],
    bullets: [
      "Keduanya memakai pengeluaran rutin; pengeluaran Spesial tidak dihitung agar prediksi tidak terdistorsi.",
      "Prediksi bersifat estimasi. Makin lengkap dan konsisten catatanmu, makin stabil polanya.",
    ],
  },
  {
    id: "what-if-yir",
    groupId: "fitur",
    title: "What-If & Year-in-Review",
    tag: "Pro",
    summary: "Simulasi perubahan kebiasaan dan kilasan tahunanmu.",
    body: [
      "What-If mensimulasikan dampak perubahan pengeluaran atau pemasukan terhadap targetmu, misalnya bagaimana jika jajan dikurangi Rp300.000 per bulan. Year-in-Review merangkum perjalanan keuanganmu sepanjang tahun dalam satu kilasan.",
    ],
    bullets: [
      "Simulasi What-If tidak mengubah datamu; semuanya bersifat perkiraan.",
      "Year-in-Review memakai data aktual, termasuk pengeluaran Spesial.",
    ],
  },
  {
    id: "tagihan",
    groupId: "fitur",
    title: "Tagihan & Pembayaran Otomatis",
    summary: "Pengingat tagihan yang bisa mencatat pembayarannya otomatis.",
    body: [
      "Tagihan menyimpan pengeluaran berulang seperti kos, listrik, dan langganan. Artami menghitung berapa hari lagi jatuh tempo dan menandai yang sudah lewat. Saat kamu menandai tagihan dibayar, Artami otomatis membuat transaksinya di catatan bulan berjalan.",
    ],
    bullets: [
      "Frekuensi tagihan bisa disesuaikan dengan kebutuhanmu.",
      "Tagihan yang tidak dipakai lagi bisa dimatikan tanpa harus dihapus.",
    ],
  },
  {
    id: "undo",
    groupId: "fitur",
    title: "Undo (Batalkan Transaksi)",
    summary: "Salah catat? Batalkan tanpa menghapus manual di spreadsheet.",
    body: [
      "Setelah menambah transaksi, muncul notifikasi Undo yang bisa kamu pakai untuk membatalkannya. Pembatalan menghapus baris transaksi di spreadsheet-mu dan mengembalikan kuota bulan berjalan.",
    ],
    bullets: [
      "Undo tidak menghitung kuota dua kali; transaksi yang dibatalkan tidak dihitung sebagai penggunaan.",
    ],
  },
  {
    id: "data-sheets",
    groupId: "data",
    title: "Datamu tersimpan di Google Sheets",
    summary: "Catatan keuanganmu milikmu sendiri, bukan database Artami.",
    body: [
      "Semua transaksi, anggaran, target, dan tagihan tersimpan di spreadsheet Google milikmu sendiri. Kamu bisa membukanya langsung dari Google Sheets kapan saja, termasuk mengunduh atau mengarsipkannya.",
    ],
    bullets: [
      "Tidak ada vendor analitik pihak ketiga yang membaca catatanmu.",
      "Kalau akun Artami dihapus, spreadsheet-mu tetap milikmu dan tidak ikut terhapus.",
    ],
  },
  {
    id: "privasi",
    groupId: "data",
    title: "Privasi-first, tanpa koneksi bank",
    summary: "Tanpa akses bank, tanpa iklan, tanpa berbagi data.",
    body: [
      "Artami tidak pernah meminta akses ke rekening atau e-wallet-mu. Tidak ada bank linking, tidak ada iklan, dan tidak ada penjualan data. Satu-satunya cara data masuk ke Artami adalah lewat catatan yang kamu tulis sendiri.",
    ],
  },
  {
    id: "kuota-free",
    groupId: "free-pro",
    title: "Kuota & batasan Free",
    summary: "Batas pakai Free dan apa yang terjadi saat mencapainya.",
    body: [
      "Paket Free punya batas bulanan: 75 transaksi, 3 anggaran, 1 target, 3 insight per minggu, dan riwayat 4 bulan (bulan berjalan plus 3 bulan sebelumnya). Artami memperingatkanmu di 80% dan 100% batas.",
    ],
    bullets: [
      "Menghapus transaksi membebaskan kuota lagi.",
      "Riwayat lebih lama dari 4 bulan tidak dihapus; datanya tetap utuh di Google Sheets-mu, hanya tidak ditampilkan di aplikasi.",
      "Saldo, kekayaan bersih, dan anggaran tetap dihitung penuh meski riwayat disembunyikan.",
    ],
  },
  {
    id: "free-vs-pro",
    groupId: "free-pro",
    title: "Perbedaan Free & Pro",
    summary: "Apa saja yang terbuka dengan sekali bayar, bukan langganan.",
    body: [
      "Pro adalah pembelian sekali bayar, bukan langganan. Kamu mendapat transaksi, anggaran, dan target tanpa batas, riwayat penuh, PDF tanpa watermark, serta fitur pintar: Health Score, Cash Flow Forecast, Anomaly Alerts, Financial Independence, What-If, dan Year-in-Review.",
    ],
    bullets: [
      "Bayar sekali via QRIS; setelah bukti bayar diverifikasi, Pro langsung aktif.",
      "Datamu tidak berpindah; semuanya tetap di Google Sheets-mu.",
    ],
  },
])





