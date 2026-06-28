"use client"
import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-cream-100">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-earth-600 hover:text-earth-800 mb-6"
          >
            <ArrowLeft size={16} />
            Kembali ke Beranda
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
              <FileText size={24} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-earth-900">
                Syarat & Ketentuan
              </h1>
              <p className="text-sm text-earth-500">
                Terakhir diperbarui: 28 Juni 2026
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-warm p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">1. Penerimaan Syarat</h2>
            <p className="text-earth-700 leading-relaxed">
              Dengan mengakses atau menggunakan Artoku Finance Dashboard (&ldquo;Layanan&rdquo;), Anda setuju untuk terikat oleh Syarat & Ketentuan ini. Jika Anda tidak setuju dengan syarat ini, mohon untuk tidak menggunakan Layanan kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">2. Deskripsi Layanan</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Artoku adalah dashboard keuangan pribadi yang membantu Anda melacak:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>Pemasukan dan pengeluaran</li>
              <li>Anggaran bulanan</li>
              <li>Tujuan tabungan</li>
              <li>Tagihan dan pengingat</li>
              <li>Laporan keuangan</li>
            </ul>
            <p className="text-earth-700 leading-relaxed mt-3">
              Data Anda disimpan di Google Sheet pribadi Anda sendiri. Kami tidak menyimpan data keuangan Anda di server kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">3. Tanggung Jawab Pengguna</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Anda bertanggung jawab untuk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>Menyediakan informasi yang akurat</li>
              <li>Menjaga keamanan akun Anda</li>
              <li>Menggunakan Layanan untuk tujuan yang sah</li>
              <li>Tidak mencoba mengakses data pengguna lain</li>
              <li>Tidak menyalahgunakan atau merusak Layanan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">4. Ketentuan Pembayaran</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Artoku menggunakan model pembayaran satu kali:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li><strong>Harga:</strong> Rp 49.000 untuk akses seumur hidup</li>
              <li><strong>Tidak ada langganan:</strong> Tidak ada biaya berulang</li>
              <li><strong>Metode pembayaran:</strong> QRIS</li>
              <li><strong>Fitur gratis:</strong> 75 transaksi/bulan, 4 bulan riwayat, 3 anggaran, 1 tujuan</li>
              <li><strong>Fitur premium:</strong> Tanpa batas + fitur pintar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">5. Batasan Tanggung Jawab</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Artoku tidak bertanggung jawab atas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>Keputusan keuangan yang dibuat berdasarkan Layanan</li>
              <li>Kerugian akibat penggunaan Layanan</li>
              <li>Kesalahan dalam data yang Anda masukkan</li>
              <li>Gangguan layanan atau downtime</li>
            </ul>
            <p className="text-earth-700 leading-relaxed mt-3">
              <strong>Pernyataan Penting:</strong> Artoku adalah alat pelacak keuangan, bukan penasihat keuangan. Kami tidak memberikan saran keuangan. Gunakan Layanan dengan risiko Anda sendiri.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">6. Penghentian Layanan</h2>
            <p className="text-earth-700 leading-relaxed">
              Kami berhak menghentikan atau menangguhkan akun Anda jika Anda melanggar Syarat & Ketentuan ini. Anda juga dapat menghentikan penggunaan Layanan kapan saja dengan menghapus akun Anda.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">7. Perubahan pada Syarat Ini</h2>
            <p className="text-earth-700 leading-relaxed">
              Kami dapat memperbarui Syarat & Ketentuan ini dari waktu ke waktu. Kami akan memberitahu Anda tentang perubahan signifikan melalui email atau pemberitahuan dalam aplikasi. Penggunaan Layanan secara berkelanjutan setelah perubahan berarti Anda menerima syarat yang diperbarui.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">8. Hukum yang Berlaku</h2>
            <p className="text-earth-700 leading-relaxed">
              Syarat & Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap sengketa yang timbul dari atau terkait dengan syarat ini akan diselesaikan di pengadilan yang berwenang di Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">9. Hubungi Kami</h2>
            <p className="text-earth-700 leading-relaxed">
              Jika Anda memiliki pertanyaan tentang Syarat & Ketentuan ini, silakan hubungi kami di:
            </p>
            <p className="text-earth-700 mt-2">
              <strong>Email:</strong> isnanfauzi08@gmail.com
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/privacy"
            className="text-sm text-moss-600 hover:text-moss-700 underline"
          >
            Kebijakan Privasi
          </Link>
        </div>
      </div>
    </div>
  )
}
