"use client"

import { CalendarDays, CircleAlert, FileSpreadsheet, Lightbulb, Target, TrendingUp, WalletCards } from "lucide-react"
import { useState } from "react"

const SHOWCASE_TABS = [
  { id: "summary", label: "Ringkasan", detail: "Pola dan sinyal penting" },
  { id: "planning", label: "Budget & tujuan", detail: "Ruang untuk langkah berikutnya" },
  { id: "event", label: "Event budget", detail: "Rencana untuk momen besar" },
]

function WorkspaceChrome({ label, children }) {
  return (
    <div className="showcase-workspace">
      <div className="showcase-workspace__chrome">
        <span>Artami</span>
        <strong>{label}</strong>
        <small>Contoh tampilan</small>
      </div>
      <div className="showcase-workspace__body">
        <aside aria-hidden="true">
          <strong>Artami</strong>
          <i className="is-active" /><i /><i /><i /><i />
          <span><FileSpreadsheet />Sheet terhubung</span>
        </aside>
        <div className="showcase-workspace__content">{children}</div>
      </div>
    </div>
  )
}

function SummarySurface() {
  return (
    <WorkspaceChrome label="Ringkasan">
      <header className="showcase-surface__header"><div><span>Ringkasan pola</span><h3>Pola yang perlu kamu lihat</h3></div><small>42 transaksi bulan ini</small></header>
      <div className="showcase-summary-grid">
        <article className="showcase-cashflow">
          <span>Arus kas bersih</span><strong>+Rp3.240.000</strong><small><TrendingUp /> Lebih sehat dari Juni</small>
          <svg viewBox="0 0 520 170" role="presentation"><path className="showcase-chart-grid" d="M0 38H520M0 90H520M0 142H520" /><path className="showcase-chart-area" d="M0 136C58 128 81 87 132 98S208 140 267 91 355 43 412 59 472 36 520 24V170H0Z" /><path data-draw="" className="showcase-chart-line" d="M0 136C58 128 81 87 132 98S208 140 267 91 355 43 412 59 472 36 520 24" /></svg>
        </article>
        <article className="showcase-score"><span>Financial Health</span><strong>78<small>/100</small></strong><i><b style={{ width: "78%" }} /></i><p>Baik, dengan satu area yang perlu dijaga.</p></article>
      </div>
      <div className="showcase-signal"><CircleAlert /><div><span>Sinyal pengeluaran</span><strong>Jajan naik 42%</strong><p>Rp420.000 lebih tinggi dari rata-rata tiga bulan terakhir.</p></div><small>Lihat konteks →</small></div>
    </WorkspaceChrome>
  )
}

function PlanningSurface() {
  return (
    <WorkspaceChrome label="Budget & tujuan">
      <header className="showcase-surface__header"><div><span>Rencana aktif</span><h3>Ruang untuk langkah berikutnya</h3></div><small>3 budget · 1 tujuan</small></header>
      <div className="showcase-planning-total"><div><span>Tersedia bulan ini</span><strong>Rp1.200.000</strong></div><span>24% tersisa</span></div>
      <div className="showcase-plan-list">
        <article><div><WalletCards /><span>Kebutuhan<small>Rp2,4 jt dari Rp3 jt</small></span><strong>80%</strong></div><i><b style={{ width: "80%" }} /></i></article>
        <article><div><WalletCards /><span>Jajan<small>Rp1,42 jt dari Rp1,5 jt</small></span><strong className="is-alert">95%</strong></div><i><b style={{ width: "95%" }} /></i></article>
        <article><div><Target /><span>HP Baru<small>Rp4,2 jt dari Rp10 jt</small></span><strong>42%</strong></div><i><b style={{ width: "42%" }} /></i></article>
      </div>
      <div className="showcase-recommendation"><Lightbulb /><span><strong>Langkah paling berdampak</strong>Kurangi Rp300.000 dari Jajan agar target tetap di jalur.</span></div>
    </WorkspaceChrome>
  )
}

function EventSurface({ events, activeEvent, onSelect }) {
  const event = events.find((item) => item.id === activeEvent) || events[0]
  if (!event) return null

  return (
    <WorkspaceChrome label="Event budget">
      <header className="showcase-surface__header"><div><span>Momental</span><h3>Rencana untuk momen besar</h3></div><small>{events.length} rencana</small></header>
      <div className="showcase-event-tabs" aria-label="Pilih event budget">
        {events.map((item) => <button type="button" className={item.id === event.id ? "is-active" : ""} key={item.id} onClick={() => onSelect(item.id)}><CalendarDays />{item.name}</button>)}
      </div>
      <div className="showcase-event-main">
        <div className="showcase-event-ring" style={{ "--event-progress": `${event.progress}%` }}><strong>{event.progress}%</strong><span>siap</span></div>
        <div><span>{event.status} · {event.date}</span><h4>{event.name}</h4><p>{event.remaining} masih perlu disiapkan {event.remainingDetail}.</p></div>
      </div>
      <div className="showcase-event-list">
        {event.categories.map((category) => <article key={category.name}><span>{category.name}<small>{category.amount}</small></span><i><b style={{ width: `${category.progress}%` }} /></i><strong>{category.progress}%</strong></article>)}
      </div>
    </WorkspaceChrome>
  )
}

export default function ProductShowcase({ events = [] }) {
  const [activeTab, setActiveTab] = useState("summary")
  const [activeEvent, setActiveEvent] = useState(events[0]?.id || "")

  return (
    <section className="product-showcase chapter" id="produk" aria-labelledby="product-showcase-title" data-product-showcase="">
      <div className="product-showcase__heading" data-reveal="">
        <p className="eyebrow">Produk</p>
        <h2 id="product-showcase-title">Dari catatan menjadi keputusan.</h2>
        <p>Mulai dari catatan transaksi, lalu masuk ke budget, tujuan, dan rencana yang saling terhubung.</p>
      </div>

      <div className="product-showcase__body">
        <aside className="product-showcase__rail">
          <span>Jelajahi Artami</span>
          <div role="tablist" aria-label="Pilih tampilan produk Artami">
            {SHOWCASE_TABS.map((tab, index) => (
              <button type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "is-active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>
                <span>0{index + 1}</span><strong>{tab.label}</strong><small>{tab.detail}</small>
              </button>
            ))}
          </div>
          <p>Klik setiap bagian untuk melihat contoh alur. Semua angka bersifat ilustratif.</p>
        </aside>

        <div className="product-showcase__canvas" aria-live="polite">
          {activeTab === "summary" ? <SummarySurface /> : null}
          {activeTab === "planning" ? <PlanningSurface /> : null}
          {activeTab === "event" ? <EventSurface events={events} activeEvent={activeEvent} onSelect={setActiveEvent} /> : null}
        </div>
      </div>
    </section>
  )
}
