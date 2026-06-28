"use client"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Wallet, BarChart3, Target, Bell, TrendingUp, Shield, ArrowRight, Download, ChevronRight } from "lucide-react"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push("/dashboard")
  }, [session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="w-8 h-8 border-2 border-violet-main border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (session) return null

  const features = [
    { icon: Wallet, title: "Lacak Transaksi", desc: "Catat pemasukan dan pengeluaran harian dengan mudah" },
    { icon: BarChart3, title: "Kelola Anggaran", desc: "Atur batas pengeluaran per kategori dan pantau real-time" },
    { icon: Target, title: "Tujuan Tabungan", desc: "Tetapkan target tabungan dan pantau progress" },
    { icon: Bell, title: "Pengingat Tagihan", desc: "Jangan lewatkan pembayaran bulanan" },
    { icon: TrendingUp, title: "Laporan Keuangan", desc: "Analisis pola pengeluaran dengan grafik interaktif" },
    { icon: Shield, title: "Data Aman", desc: "Semua data tersimpan di Google Sheets Anda sendiri" },
  ]

  const steps = [
    { num: "1", title: "Masuk dengan Google", desc: "Autentikasi aman dengan akun Google Anda" },
    { num: "2", title: "Data di Google Sheets", desc: "Keuangan Anda tersimpan di sheet pribadi" },
    { num: "3", title: "Akses dari Mana Saja", desc: "Buka dari browser atau aplikasi Android" },
  ]

  const audience = [
    { title: "Profesional Muda", desc: "Kelola gaji bulanan dengan mudah" },
    { title: "Freelancer", desc: "Lacak pemasukan tidak tetap" },
    { title: "Mahasiswa", desc: "Belajar mengelola keuangan" },
    { title: "Keluarga Muda", desc: "Rencanakan anggaran rumah tangga" },
  ]

  return (
    <main className="min-h-screen bg-cream-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-cream-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c4b5f4, #9f87ef)" }}>
              <span className="text-white text-sm font-display font-bold">A</span>
            </div>
            <span className="font-display font-bold text-earth-800">Artami</span>
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #9f87ef, #c4b5f4)" }}
          >
            Masuk
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #c4b5f4, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #f5c4a1, transparent 70%)" }} />
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-earth-900 mb-4">
            <span style={{ color: "#9f87ef" }}>Artami</span>
          </h1>
          <p className="text-xl md:text-2xl text-earth-600 mb-6 font-medium">
            Dashboard Keuangan Pribadi untuk Indonesia
          </p>
          <p className="text-earth-500 max-w-lg mx-auto mb-8 leading-relaxed">
            Kelola keuangan pribadi Anda dengan mudah. Lacak pemasukan, pengeluaran, anggaran, dan tujuan tabungan dalam satu tempat. Data tersimpan aman di Google Sheets Anda.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #9f87ef, #c4b5f4)" }}
          >
            Mulai Sekarang
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-center text-earth-900 mb-12">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-cream-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                <f.icon size={24} className="text-violet-500" />
              </div>
              <h3 className="font-display font-bold text-earth-800 mb-2">{f.title}</h3>
              <p className="text-sm text-earth-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center text-earth-900 mb-12">Cara Kerja</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-display font-bold text-white" style={{ background: "linear-gradient(135deg, #9f87ef, #c4b5f4)" }}>
                  {s.num}
                </div>
                <h3 className="font-display font-bold text-earth-800 mb-2">{s.title}</h3>
                <p className="text-sm text-earth-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-center text-earth-900 mb-12">Untuk Siapa?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audience.map((a, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-cream-100 text-center">
              <h3 className="font-display font-bold text-earth-800 mb-2">{a.title}</h3>
              <p className="text-sm text-earth-500">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Download APK */}
      <section className="bg-white py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-moss-50">
            <Download size={32} className="text-moss-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-earth-900 mb-3">Download untuk Android</h2>
          <p className="text-earth-500 mb-6">Akses Artami dari perangkat Android Anda</p>
          <a
            href="/api/download-apk"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #6b8a6b, #8aad8a)" }}
          >
            <Download size={20} />
            Download APK
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-br from-violet-50 to-cream-50 rounded-3xl p-12">
          <h2 className="font-display text-3xl font-bold text-earth-900 mb-4">Mulai Kelola Keuangan Anda</h2>
          <p className="text-earth-500 mb-8">Gratis untuk memulai. Tidak perlu kartu kredit.</p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #9f87ef, #c4b5f4)" }}
          >
            Masuk dengan Google
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-cream-100 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c4b5f4, #9f87ef)" }}>
              <span className="text-white text-xs font-display font-bold">A</span>
            </div>
            <span className="font-display font-bold text-earth-800">Artami</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-earth-500 mb-4">
            <a href="/privacy" className="hover:text-earth-700 transition-colors">Kebijakan Privasi</a>
            <span>·</span>
            <a href="/terms" className="hover:text-earth-700 transition-colors">Syarat & Ketentuan</a>
          </div>
          <p className="text-xs text-earth-400">
            © 2026 Artami · isnanfauzi08@gmail.com
          </p>
        </div>
      </footer>
    </main>
  )
}
