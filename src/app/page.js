"use client"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-cream-50 px-6">
      {/* Background decoration */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #c4b5f4, transparent 70%)" }} />
      <div className="fixed bottom-0 left-0 w-80 h-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #f5c4a1, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, #c4b5f4, #9f87ef)" }}>
            <span className="text-white text-2xl font-display font-bold">₹</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-800 leading-tight">
            <span style={{ color: "#9f87ef" }}>Artami</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Dashboard Keuangan Pribadi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-cream-100">
          <h2 className="font-display text-xl font-semibold text-gray-700 mb-1">Selamat Datang</h2>
          <p className="text-sm text-gray-400 mb-6">Masuk untuk melihat ringkasan keuangan kamu</p>

          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl font-medium text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #9f87ef, #c4b5f4)", color: "white" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="white" opacity="0.9"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="white" opacity="0.7"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="white" opacity="0.5"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="white" opacity="0.6"/>
            </svg>
            Masuk dengan Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Data tersimpan aman di Google Sheets kamu</p>
        <p className="text-center text-xs text-gray-400 mt-3">
          Dengan masuk, Anda setuju dengan{" "}
          <a href="/terms" className="underline hover:text-gray-600">Syarat & Ketentuan</a>
          {" "}dan{" "}
          <a href="/privacy" className="underline hover:text-gray-600">Kebijakan Privasi</a>
        </p>
      </div>
    </main>
  )
}
