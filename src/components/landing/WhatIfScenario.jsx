"use client"

import { ArrowUpRight, CalendarClock, CircleDollarSign, Sparkles, Target } from "lucide-react"
import { useState } from "react"

const RESULTS = [
  { targetDate: "Agustus 2027", cashFlow: "+Rp2,4 jt", progress: "62%", line: "impact-line--first" },
  { targetDate: "Mei 2027", cashFlow: "+Rp3,4 jt", progress: "74%", line: "impact-line--second" },
]

export default function ImpactLab({ scenarios = [] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeScenario = scenarios[activeIndex] || scenarios[0]
  const result = RESULTS[activeIndex] || RESULTS[0]

  if (!activeScenario) return null

  return (
    <section className="impact-lab chapter" id="dampak" aria-labelledby="impact-title">
      <div className="impact-lab__heading" data-reveal="">
        <h2 id="impact-title">Uji satu perubahan sebelum menjalaninya.</h2>
        <p>Bandingkan keputusan kecil dengan proyeksi arus kas dan target yang sedang kamu kejar.</p>
      </div>

      <div className="impact-lab__workspace" data-reveal="">
        <div className="impact-lab__chrome"><span>Artami</span><strong>What-If · HP Baru</strong><small>Simulasi contoh</small></div>
        <div className="impact-lab__body">
          <aside>
            <span className="impact-lab__label">Pilih simulasi</span>
            <div className="impact-lab__controls" aria-label="Pilih simulasi">
              {scenarios.map((scenario, index) => (
                <button type="button" aria-pressed={activeIndex === index} className={activeIndex === index ? "is-active" : ""} key={scenario.id} onClick={() => setActiveIndex(index)}>
                  <span>{index === 0 ? "−" : "+"}</span><strong>{scenario.adjustment}</strong><ArrowUpRight />
                </button>
              ))}
            </div>
            <div className="impact-lab__note"><Sparkles /><p>{activeScenario.outcome}</p></div>
          </aside>

          <div className="impact-lab__canvas" aria-live="polite">
            <header><div><span>Proyeksi arus kas 90 hari</span><strong>{result.cashFlow}</strong></div><span className="impact-lab__badge">Setelah perubahan</span></header>
            <svg viewBox="0 0 760 270" role="presentation">
              <path className="impact-grid" d="M0 48H760M0 118H760M0 188H760M0 258H760" />
              <path className="impact-area" d="M0 226C78 220 111 182 174 190S281 231 350 169 466 101 537 118 666 70 760 56V270H0Z" />
              <path data-draw="" className={`impact-line ${result.line}`} d="M0 226C78 220 111 182 174 190S281 231 350 169 466 101 537 118 666 70 760 56" />
              <circle cx="537" cy="118" r="7" /><circle cx="760" cy="56" r="7" />
            </svg>
            <div className="impact-lab__summary">
              <article><CalendarClock /><span>Perkiraan target<strong>{result.targetDate}</strong></span></article>
              <article><Target /><span>Progress tujuan<strong>{result.progress}</strong></span></article>
              <article><CircleDollarSign /><span>Target nominal<strong>Rp10.000.000</strong></span></article>
            </div>
          </div>
        </div>
      </div>

      <p className="fine-print">Simulasi ini bersifat ilustratif berdasarkan catatanmu, bukan nasihat keuangan profesional.</p>
    </section>
  )
}
