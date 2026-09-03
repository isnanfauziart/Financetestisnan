"use client"

import { useRef, useState } from "react"
import {
  Activity,
  BellRing,
  BookOpen,
  FileSpreadsheet,
  Gauge,
  Radar,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"

const SIGNALS = [
  { id: "health", icon: Gauge, title: "Health Score", copy: "Baca kondisi keuanganmu sekarang." },
  { id: "forecast", icon: TrendingUp, title: "Cash Flow Forecast", copy: "Lihat prediksi Cash Flow kamu beberapa waktu kedepan" },
  { id: "anomaly", icon: BellRing, title: "Anomaly Alerts", copy: "Temukan perubahan yang layak diperiksa." },
  { id: "freedom", icon: Target, title: "Financial Freedom", copy: "Artami memproyeksikan nominal yang diperlukan untuk pensiun dini" },
]

const SUPPORTS = [
  { icon: Radar, title: "Recurring Expense Radar", copy: "Kenali biaya rutin yang mengambil ruang sedikit demi sedikit." },
  { icon: Sparkles, title: "Smart insights", copy: "Ringkasan mingguan yang stabil dan terkait dengan catatanmu." },
  { icon: BookOpen, title: "Year-in-Review", copy: "Lihat satu tahun sebagai perjalanan yang bisa dipelajari." },
]

function IllustrativeBadge() {
  return <span className="intelligence-example-badge">Contoh ilustratif</span>
}

function HealthPanel() {
  return (
    <div className="intelligence-feature intelligence-feature--health">
      <header><div><span>Health Score</span><h3>Kondisi keuangan dalam satu skor</h3></div><IllustrativeBadge /></header>
      <div className="intelligence-health-ui">
        <div className="intelligence-health-ring"><strong>78</strong><span>/100</span></div>
        <div className="intelligence-factor-list">
          <span><b>Arus kas</b><i><em style={{ width: "82%" }} /></i><small>Aman</small></span>
          <span><b>Tabungan</b><i><em style={{ width: "68%" }} /></i><small>Baik</small></span>
          <span><b>Pengeluaran rutin</b><i><em style={{ width: "57%" }} /></i><small>Perlu dijaga</small></span>
        </div>
      </div>
      <p>Faktor penting diringkas agar kamu tahu bagian yang sehat dan bagian yang perlu perhatian.</p>
    </div>
  )
}

function ForecastPanel() {
  return (
    <div className="intelligence-feature intelligence-feature--forecast">
      <header><div><span>Cash Flow Forecast</span><h3>Proyeksi arus kas 90 hari</h3></div><IllustrativeBadge /></header>
      <div className="intelligence-forecast-summary"><span>Ruang yang diproyeksikan</span><strong>+Rp2,4 jt</strong><small>jika pola berjalan serupa</small></div>
      <div className="intelligence-forecast-chart" aria-hidden="true">
        <svg viewBox="0 0 720 230" preserveAspectRatio="none">
          <path className="intelligence-grid" d="M0 45H720M0 112H720M0 180H720" />
          <path className="intelligence-area" d="M0 174C90 160 126 120 202 135S324 183 403 116 531 76 612 86 678 45 720 36V230H0Z" />
          <path className="intelligence-line" d="M0 174C90 160 126 120 202 135S324 183 403 116 531 76 612 86 678 45 720 36" />
        </svg>
        <div><span>Sekarang</span><span>30 hari</span><span>60 hari</span><span>90 hari</span></div>
      </div>
      <p>Perkiraan memakai pola catatan aktual sebagai bantuan merencanakan, bukan sebagai kepastian.</p>
    </div>
  )
}

function AnomalyPanel() {
  return (
    <div className="intelligence-feature intelligence-feature--anomaly">
      <header><div><span>Anomaly Alerts</span><h3>Perubahan yang layak diperiksa</h3></div><IllustrativeBadge /></header>
      <div className="intelligence-anomaly-ui">
        <div className="intelligence-anomaly-pulse"><BellRing /><i /><i /></div>
        <article><span>Jajan bulan ini</span><strong>Naik 42%</strong><small>dibanding pola rutinmu</small></article>
        <ul>
          <li><span>Frekuensi transaksi</span><strong>12 → 17 kali</strong></li>
          <li><span>Perubahan terbesar</span><strong>Pesan antar makanan</strong></li>
        </ul>
      </div>
      <p>Artami menandai perubahannya; kamu tetap menentukan konteks dan tindakan yang tepat.</p>
    </div>
  )
}

function FreedomPanel() {
  return (
    <div className="intelligence-feature intelligence-feature--freedom">
      <header><div><span>Financial Freedom</span><h3>Arah jangka panjang yang lebih konkret</h3></div><IllustrativeBadge /></header>
      <div className="intelligence-freedom-ui">
        <Target />
        <span>Nominal kebutuhan bulanan</span>
        <strong>Rp8,6 jt</strong>
        <small>Progres menuju dana mandiri: 34%</small>
        <i><b style={{ width: "34%" }} /></i>
      </div>
      <p>Ketahui nominal Financial Freedom kamu berdasarkan data aktual keuanganmu.</p>
    </div>
  )
}

const PANELS = {
  health: HealthPanel,
  forecast: ForecastPanel,
  anomaly: AnomalyPanel,
  freedom: FreedomPanel,
}

export default function FinancialIntelligence() {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabRefs = useRef([])
  const activeSignal = SIGNALS[activeIndex]
  const ActivePanel = PANELS[activeSignal.id]

  const selectWithFocus = (nextIndex) => {
    setActiveIndex(nextIndex)
    tabRefs.current[nextIndex]?.focus()
  }

  const handleKeyDown = (event, index) => {
    let nextIndex = null
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % SIGNALS.length
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + SIGNALS.length) % SIGNALS.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = SIGNALS.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    selectWithFocus(nextIndex)
  }

  return (
    <section className="intelligence-platform chapter" id="kecerdasan" aria-labelledby="intelligence-title">
      <div className="intelligence-platform__heading" data-reveal="">
        <p className="eyebrow">Financial Intelligence</p>
        <h2 id="intelligence-title">Lihat lebih jauh,<br />bukan hanya ke belakang.</h2>
        <p>Artami memberikan insight serta proyeksi masa depan terkait kondisi keuangan kamu</p>
      </div>

      <div className="intelligence-platform__showcase">
        <aside className="intelligence-platform__rail">
          <span>Salah satu fitur Artami</span>
          <div role="tablist" aria-label="Pilih fitur Financial Intelligence" aria-orientation="vertical">
            {SIGNALS.map(({ id, icon: Icon, title, copy }, index) => (
              <button
                className={activeIndex === index ? "is-active" : ""}
                id={`intelligence-tab-${id}`}
                key={id}
                type="button"
                role="tab"
                aria-controls="intelligence-feature-panel"
                aria-selected={activeIndex === index}
                tabIndex={activeIndex === index ? 0 : -1}
                ref={(node) => { tabRefs.current[index] = node }}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <Icon aria-hidden="true" /><span><strong>{title}</strong><small>{copy}</small></span>
              </button>
            ))}
          </div>
        </aside>

        <div
          className="intelligence-platform__canvas"
          data-intelligence-canvas=""
          role="tabpanel"
          id="intelligence-feature-panel"
          aria-labelledby={`intelligence-tab-${activeSignal.id}`}
        >
          <div className="intelligence-data-path"><FileSpreadsheet /><span>Google Sheet milikmu → Artami</span><small>Catatan aktual menjadi pola, konteks, dan arah.</small></div>
          <ActivePanel key={activeSignal.id} />
        </div>
      </div>

      <div className="intelligence-platform__statement" data-reveal="">
        <Activity />
        <p>Kenali kondisi keuanganmu hari ini, ambil keputusan dengan lebih bijak, dan bangun masa depan yang lebih tenang.</p>
      </div>

      <div className="intelligence-platform__supports" data-reveal-group="" data-reveal-stagger="0.08">
        {SUPPORTS.map(({ icon: Icon, title, copy }) => <article key={title}><Icon /><div><strong>{title}</strong><p>{copy}</p></div></article>)}
      </div>
    </section>
  )
}
