import {
  CircleAlert,
  FileSpreadsheet,
  Gauge,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import HeroShader from "./HeroShader"

const TRANSACTIONS = [
  { label: "Gaji bulanan", category: "Pemasukan", value: "+Rp8.500.000", tone: "positive" },
  { label: "Belanja mingguan", category: "Kebutuhan", value: "−Rp642.000", tone: "negative" },
  { label: "Setoran HP baru", category: "Tabungan", value: "−Rp500.000", tone: "neutral" },
]

function HeroProductFrame() {
  return (
    <div className="hero-product-frame" data-hero-product="">
      <div className="product-window__chrome">
        <span>Artami</span>
        <strong>Ringkasan</strong>
        <span>Contoh tampilan</span>
      </div>

      <div className="hero-dashboard">
        <aside className="hero-dashboard__sidebar">
          <strong>Artami</strong>
          <nav aria-label="Contoh navigasi aplikasi">
            <span className="is-active"><i />Ringkasan</span>
            <span><i />Statistik</span>
            <span><i />Budget</span>
            <span><i />Tujuan</span>
          </nav>
          <div className="hero-dashboard__sheet" data-hero-morph-target="ledger"><FileSpreadsheet /><span>Keuangan Saya<small>Google Sheet terhubung</small></span></div>
        </aside>

        <div className="hero-dashboard__main">
          <header className="hero-dashboard__header">
            <div><span>Selamat datang kembali</span><strong>Ringkasan keuanganmu</strong></div>
            <span>Juli 2026 · contoh</span>
          </header>

          <div className="hero-dashboard__metrics">
            <article className="hero-metric hero-metric--primary">
              <span>Ruang bulan ini</span>
              <strong>Rp1.200.000</strong>
              <small><TrendingUp /> 24% masih tersedia</small>
            </article>
            <article className="hero-anomaly-card" data-hero-morph-target="signal">
              <CircleAlert />
              <span>Sinyal bulan ini<small>Jajan naik 42% · cek konteksnya</small></span>
            </article>
          </div>

          <div className="hero-dashboard__middle">
            <article className="hero-chart-card">
              <div><span>Arus kas</span><strong>+Rp3.240.000</strong></div>
              <svg viewBox="0 0 560 190" role="presentation">
                <path className="hero-chart-grid" d="M0 35H560M0 92H560M0 150H560" />
                <path className="hero-chart-area" d="M0 146C70 138 88 104 145 112S230 154 289 101 376 55 432 68 508 40 560 26V190H0Z" />
                <path data-draw="" className="hero-chart-line" d="M0 146C70 138 88 104 145 112S230 154 289 101 376 55 432 68 508 40 560 26" />
              </svg>
              <div className="hero-chart-axis"><span>Apr</span><span>Mei</span><span>Jun</span><span>Jul</span></div>
            </article>

            <article className="hero-health-card" data-hero-morph-target="health">
              <div><Gauge /><span>Financial Health</span></div>
              <div className="hero-health-ring"><strong>78</strong><span>/100</span></div>
              <p>Arus kas aman. Jajan perlu dijaga.</p>
            </article>
          </div>

          <div className="hero-dashboard__bottom">
            <article className="hero-budget-card">
              <div><WalletCards /><span>Budget Jajan</span><strong>95%</strong></div>
              <i><b style={{ width: "95%" }} /></i>
              <small>Rp80.000 tersisa dari Rp1.500.000</small>
            </article>
            <article className="hero-transaction-card">
              <div className="hero-transaction-card__title"><span>Transaksi terakhir</span><small>Hari ini</small></div>
              {TRANSACTIONS.map((item) => (
                <div className="hero-transaction" key={item.label}>
                  <i />
                  <span>{item.label}<small>{item.category}</small></span>
                  <strong className={`is-${item.tone}`}>{item.value}</strong>
                </div>
              ))}
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditorialHero({ links }) {
  return (
    <>
      <noscript>
        <style id="landing-noscript-hero">{`
          @media (min-width: 48rem) {
            .hero { height: auto; min-height: 0; padding-top: 7rem; }
            .hero__sticky { position: relative; height: auto; min-height: 80rem; }
            .hero-product-frame { top: 32rem; }
            .hero-fragment, .hero-cursor, .hero__scroll-cue { display: none; }
          }
        `}</style>
      </noscript>
    <section className="hero" id="awal" aria-labelledby="hero-title" data-hero-stage="">
      <div className="hero__sticky" data-hero-sticky="">
        <div className="hero__atmosphere" aria-hidden="true">
          <HeroShader />
        </div>

        <div className="hero__copy" data-hero-copy="">
          <h1 id="hero-title">Pahami uangmu.<br /><em>Rencanakan hidupmu.</em></h1>
          <p>Artami mengubah catatan keuangan harian menjadi pola, rencana, dan keputusan yang lebih mudah dibaca.</p>
          <div className="button-row">
            <a className="button" href={links.webApp}>Buka Artami</a>
            <a className="text-link" href="#produk">Lihat cara kerjanya <span aria-hidden="true">→</span></a>
          </div>
        </div>

        <div className="hero-fragments" aria-hidden="true" data-hero-fragments="">
          <div className="hero-fragment hero-fragment--ledger" data-hero-fragment="" data-hero-morph-source="ledger">
            <div><FileSpreadsheet /><strong>Kategori</strong></div>
            <span><b>Kebutuhan</b><small>Rp2,4 jt</small></span>
            <span><b>Jajan</b><small>Rp1,42 jt</small></span>
            <span><b>Transportasi</b><small>Rp680 rb</small></span>
          </div>

          <div className="hero-fragment hero-fragment--health" data-hero-fragment="" data-hero-morph-source="health">
            <span>Financial Health</span>
            <strong>78<small>/100</small></strong>
            <i><b style={{ width: "78%" }} /></i>
          </div>

          <div className="hero-fragment hero-fragment--signal" data-hero-fragment="" data-hero-morph-source="signal">
            <CircleAlert />
            <div><span>Sinyal bulan ini</span><strong>Jajan naik 42%</strong><small>Cek konteks sebelum bertindak</small></div>
          </div>

          <div className="hero-cursor hero-cursor--left"><span>AR</span></div>
          <div className="hero-cursor hero-cursor--right"><Sparkles /></div>
        </div>

        <HeroProductFrame />
        <div className="hero__scroll-cue" aria-hidden="true"><span>Scroll untuk melihat Artami bekerja</span><i /></div>
      </div>

      <p className="sr-only">
        Contoh tampilan Artami menampilkan ruang bulan ini Rp1,2 juta, Financial Health Score 78, budget Jajan 95 persen, dan transaksi yang tersimpan di Google Sheet milik pengguna.
      </p>
    </section>
    </>
  )
}
