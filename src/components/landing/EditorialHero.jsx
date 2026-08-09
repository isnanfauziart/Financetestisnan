import {
  ChartNoAxesCombined,
  CircleAlert,
  FileSpreadsheet,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import HeroShader from "./HeroShader"

export default function EditorialHero({ links }) {
  return (
    <section className="hero chapter" id="awal" aria-labelledby="hero-title">
      <HeroShader />

      <div className="hero__copy">
        <p className="eyebrow">Keuangan pribadi yang bisa dibaca</p>
        <h1 id="hero-title">Pahami uangmu. Rencanakan hidupmu.</h1>
        <p className="hero__lede">Track, think and plan di satu aplikasi.</p>
        <p className="hero__support">
          Berbasis Google Sheet milikmu, tanpa perlu koneksi bank.
        </p>
        <div className="button-row">
          <a className="button" href={links.webApp}>Buka Artami</a>
          <a className="text-link" href="#fitur">
            Lihat cara kerjanya <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>

      <div className="hero-canvas" aria-hidden="true">
        <div className="hero-float hero-float--score">
          <div className="app-icon app-icon--violet"><ChartNoAxesCombined /></div>
          <span>Financial Health</span>
          <strong>78 <small>/ 100</small></strong>
          <div className="mini-progress"><i style={{ width: "78%" }} /></div>
        </div>

        <div className="hero-float hero-float--sheet">
          <div className="app-icon app-icon--green"><FileSpreadsheet /></div>
          <div><strong>Sheet milikmu</strong><span>Data tetap dalam kendalimu</span></div>
          <ShieldCheck className="hero-float__status" />
        </div>

        <div className="hero-float hero-float--budget">
          <div className="float-title"><WalletCards /><span>Budget bulan ini</span></div>
          <strong>Rp3,8 jt <small>dari Rp5 jt</small></strong>
          <div className="mini-progress"><i style={{ width: "76%" }} /></div>
          <span className="float-note">Rp1,2 jt masih tersedia</span>
        </div>

        <div className="hero-float hero-float--alert">
          <CircleAlert />
          <div><strong>Pengeluaran tidak biasa</strong><span>Jajan naik 42% dari biasanya</span></div>
        </div>

        <div className="hero-float hero-float--forecast">
          <div className="float-title"><span>Proyeksi arus kas</span><strong>+Rp2,4 jt</strong></div>
          <svg viewBox="0 0 260 72" role="presentation">
            <path d="M3 58 C36 55, 48 30, 80 38 S126 65, 151 35 S207 12, 257 18" />
            <path className="forecast-area" d="M3 58 C36 55, 48 30, 80 38 S126 65, 151 35 S207 12, 257 18 L257 72 L3 72 Z" />
          </svg>
        </div>
      </div>

      <p className="sr-only">
        Contoh tampilan Artami menunjukkan skor kesehatan 78, budget tersisa Rp1,2 juta, proyeksi arus kas positif Rp2,4 juta, dan peringatan pengeluaran Jajan naik 42 persen.
      </p>
    </section>
  )
}
