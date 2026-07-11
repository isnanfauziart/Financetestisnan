"use client"
import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"

export default function PrivacyPolicy() {
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
            <div className="w-12 h-12 rounded-2xl bg-moss-100 flex items-center justify-center">
              <Shield size={24} className="text-moss-600" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-earth-900">
                Kebijakan Privasi
              </h1>
              <p className="text-sm text-earth-500">
                Terakhir diperbarui: 11 Juli 2026
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-warm p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">1. Pendahuluan</h2>
            <p className="text-earth-700 leading-relaxed">
              Kebijakan Privasi ini menjelaskan bagaimana Artami (&ldquo;kami&rdquo;, &ldquo;kita&rdquo;) mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat Anda menggunakan layanan kami. Dengan menggunakan Artami, Anda setuju dengan pengumpulan dan penggunaan informasi sesuai dengan kebijakan ini.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">2. Informasi yang Kami Kumpulkan</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Kami mengumpulkan dan/atau mengakses informasi berikut saat Anda menggunakan layanan kami:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>
                <strong>Informasi Akun Google:</strong> Nama, alamat email, dan foto profil dari akun Google Anda untuk autentikasi dan identifikasi akun.
              </li>
              <li>
                <strong>Data Google Sheets:</strong> File Google Sheets yang Anda hubungkan atau gunakan untuk Artami, termasuk data yang Anda masukkan seperti pemasukan, pengeluaran, tabungan, anggaran, tujuan, tagihan, acara, pengaturan, dan catatan keuangan lainnya.
              </li>
              <li>
                <strong>Data Penggunaan:</strong> Fitur yang digunakan dan frekuensi penggunaan untuk menjaga batas fitur, meningkatkan stabilitas layanan, dan membantu dukungan pengguna.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">3. Bagaimana Kami Menggunakan Informasi Anda</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Kami menggunakan informasi yang dikumpulkan atau diakses hanya untuk menyediakan fitur Artami yang digunakan langsung oleh pengguna, termasuk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>Menyediakan dan memelihara layanan kami</li>
              <li>Mengautentikasi identitas Anda melalui Google OAuth</li>
              <li>Membaca dan memperbarui Google Sheets yang digunakan sebagai database keuangan Anda</li>
              <li>Mencatat pemasukan, pengeluaran, tabungan, anggaran, tujuan, tagihan, acara, dan pengaturan</li>
              <li>Membuat ringkasan, grafik, laporan, dan insight keuangan</li>
              <li>Mengelola akun, status akses, dan fitur yang tersedia untuk Anda</li>
              <li>Mengirimkan pemberitahuan penting terkait layanan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">4. Penyimpanan Data</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Data Anda disimpan sebagai berikut:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>
                <strong>Data Keuangan:</strong> Disimpan di Google Sheets yang terhubung dengan akun Google Anda. Artami mengakses spreadsheet tersebut hanya dengan izin Anda dan hanya untuk menjalankan fitur aplikasi.
              </li>
              <li>
                <strong>Informasi Akun:</strong> Nama, email, status akun, dan ID spreadsheet dapat disimpan di Supabase (PostgreSQL) untuk manajemen pengguna, pembayaran, dan akses fitur.
              </li>
              <li>
                <strong>Keamanan:</strong> Data dikirim melalui koneksi HTTPS. Token akses Google tidak ditampilkan kepada pengguna di sisi browser.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">5. Penggunaan Data Google</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Artami menggunakan Google OAuth dan Google Sheets API agar pengguna dapat menjadikan Google Sheets sebagai tempat penyimpanan data keuangan pribadi. Akses ini digunakan hanya untuk fitur yang terlihat dan digunakan langsung oleh pengguna.
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>Artami dapat membaca isi spreadsheet yang digunakan untuk dashboard keuangan Artami.</li>
              <li>Artami dapat menambahkan, memperbarui, dan menghapus baris data sesuai tindakan pengguna di aplikasi.</li>
              <li>Artami tidak menggunakan data Google pengguna untuk iklan bertarget.</li>
              <li>Artami tidak menjual, menyewakan, atau mentransfer data Google pengguna kepada pengiklan, broker data, atau pihak ketiga untuk tujuan pemasaran.</li>
              <li>Artami tidak menggunakan data Google Workspace pengguna untuk melatih model AI/ML umum.</li>
            </ul>
            <p className="text-earth-700 leading-relaxed mt-3">
              Penggunaan data mentah maupun data turunan yang diterima dari Google API oleh Artami mematuhi Google API Services User Data Policy, termasuk persyaratan Limited Use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">6. Layanan Pihak Ketiga</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Kami menggunakan layanan pihak ketiga berikut:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li><strong>Google OAuth:</strong> Untuk autentikasi pengguna</li>
              <li><strong>Google Sheets API:</strong> Untuk penyimpanan data keuangan</li>
              <li><strong>Supabase:</strong> Untuk manajemen pengguna</li>
              <li><strong>Vercel:</strong> Untuk hosting aplikasi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">7. Hak Anda</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Anda memiliki hak berikut terkait data Anda:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li><strong>Akses:</strong> Mengakses data pribadi Anda</li>
              <li><strong>Koreksi:</strong> Memperbaiki data yang tidak akurat</li>
              <li><strong>Penghapusan:</strong> Meminta penghapusan data Anda</li>
              <li><strong>Ekspor:</strong> Mengekspor data Anda dari Google Sheet</li>
              <li><strong>Pencabutan akses:</strong> Mencabut akses Artami melalui halaman keamanan akun Google Anda</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">8. Retensi dan Penghapusan Data</h2>
            <p className="text-earth-700 leading-relaxed">
              Data keuangan yang berada di Google Sheets tetap berada di akun Google Anda dan dapat Anda hapus langsung melalui Google Drive. Jika Anda meminta penghapusan akun Artami, kami akan menghapus metadata akun yang tersimpan di sistem kami, seperti email, nama, status akun, dan ID spreadsheet. Setelah akses Google dicabut, Artami tidak lagi dapat mengakses spreadsheet Anda.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">9. Keamanan Data</h2>
            <p className="text-earth-700 leading-relaxed">
              Kami mengambil langkah-langkah keamanan yang wajar untuk melindungi data Anda dari akses yang tidak sah, perubahan, pengungkapan, atau penghancuran. Namun, tidak ada metode transmisi melalui Internet atau penyimpanan elektronik yang 100% aman.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">10. Perubahan pada Kebijakan Ini</h2>
            <p className="text-earth-700 leading-relaxed">
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Kami akan memberitahu Anda tentang perubahan apa pun dengan memposting kebijakan baru di halaman ini. Anda disarankan untuk meninjau Kebijakan Privasi ini secara berkala untuk setiap perubahan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">11. Hubungi Kami</h2>
            <p className="text-earth-700 leading-relaxed">
              Jika Anda memiliki pertanyaan tentang Kebijakan Privasi ini, silakan hubungi kami di:
            </p>
            <p className="text-earth-700 mt-2">
              <strong>Email:</strong> isnanfauzi08@gmail.com
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/terms"
            className="text-sm text-moss-600 hover:text-moss-700 underline"
          >
            Syarat & Ketentuan
          </Link>
        </div>
      </div>
    </div>
  )
}
