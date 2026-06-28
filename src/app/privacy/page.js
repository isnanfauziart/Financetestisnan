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
                Terakhir diperbarui: 28 Juni 2026
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-warm p-6 md:p-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">1. Pendahuluan</h2>
            <p className="text-earth-700 leading-relaxed">
              Kebijakan Privasi ini menjelaskan bagaimana Artoku (&ldquo;kami&rdquo;, &ldquo;kita&rdquo;) mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda saat Anda menggunakan layanan kami. Dengan menggunakan Artoku, Anda setuju dengan pengumpulan dan penggunaan informasi sesuai dengan kebijakan ini.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">2. Informasi yang Kami Kumpulkan</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Kami mengumpulkan informasi berikut saat Anda menggunakan layanan kami:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>
                <strong>Informasi Akun Google:</strong> Nama, alamat email, dan foto profil dari akun Google Anda
              </li>
              <li>
                <strong>Data Keuangan:</strong> Transaksi, anggaran, tujuan, dan pengaturan yang Anda masukkan
              </li>
              <li>
                <strong>Data Penggunaan:</strong> Fitur yang digunakan dan frekuensi penggunaan
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">3. Bagaimana Kami Menggunakan Informasi Anda</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Kami menggunakan informasi yang dikumpulkan untuk:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>Menyediakan dan memelihara layanan kami</li>
              <li>Mengautentikasi identitas Anda melalui Google OAuth</li>
              <li>Menyimpan data keuangan Anda di Google Sheet pribadi</li>
              <li>Mengelola akun dan langganan Anda</li>
              <li>Mengirimkan pemberitahuan penting terkait layanan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">4. Penyimpanan Data</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Data Anda disimpan dengan aman:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li>
                <strong>Data Keuangan:</strong> Disimpan di Google Sheet pribadi Anda. Kami tidak memiliki akses ke kata sandi akun Google Anda.
              </li>
              <li>
                <strong>Informasi Akun:</strong> Disimpan di Supabase (PostgreSQL) untuk manajemen pengguna.
              </li>
              <li>
                <strong>Keamanan:</strong> Data dienkripsi selama transmisi menggunakan HTTPS.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">5. Layanan Pihak Ketiga</h2>
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
            <h2 className="text-lg font-bold text-earth-900 mb-3">6. Hak Anda</h2>
            <p className="text-earth-700 leading-relaxed mb-3">
              Anda memiliki hak berikut terkait data Anda:
            </p>
            <ul className="list-disc list-inside space-y-2 text-earth-700">
              <li><strong>Akses:</strong> Mengakses data pribadi Anda</li>
              <li><strong>Koreksi:</strong> Memperbaiki data yang tidak akurat</li>
              <li><strong>Penghapusan:</strong> Meminta penghapusan data Anda</li>
              <li><strong>Ekspor:</strong> Mengekspor data Anda dari Google Sheet</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">7. Keamanan Data</h2>
            <p className="text-earth-700 leading-relaxed">
              Kami mengambil langkah-langkah keamanan yang wajar untuk melindungi data Anda dari akses yang tidak sah, perubahan, pengungkapan, atau penghancuran. Namun, tidak ada metode transmisi melalui Internet atau penyimpanan elektronik yang 100% aman.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">8. Perubahan pada Kebijakan Ini</h2>
            <p className="text-earth-700 leading-relaxed">
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Kami akan memberitahu Anda tentang perubahan apa pun dengan memposting kebijakan baru di halaman ini. Anda disarankan untuk meninjau Kebijakan Privasi ini secara berkala untuk setiap perubahan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-earth-900 mb-3">9. Hubungi Kami</h2>
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
