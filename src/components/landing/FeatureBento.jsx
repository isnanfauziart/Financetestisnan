"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { CircleAlert, TrendingUp, Utensils } from "lucide-react"

gsap.registerPlugin(useGSAP, ScrollTrigger)

const HEATMAP_CELLS = Object.freeze([
  { level: 1 }, { level: 2 }, { level: 1 }, { level: 3 }, { level: 2 }, { level: 1 }, { level: 0 },
  { level: 2 }, { level: 3 }, { level: 2, label: "Rp240rb" }, { level: 4 }, { level: 3 }, { level: 1 }, { level: 0 },
  { level: 1 }, { level: 2 }, { level: 3 }, { level: 2 }, { level: 4, label: "Rp420rb" }, { level: 2 }, { level: 1 },
  { level: 0 }, { level: 2 }, { level: 1 }, { level: 3 }, { level: 2 }, { level: 1 }, { level: 0 },
  { level: 1 }, { level: 2 }, { level: 2 }, { level: 3 }, { level: 1 }, { level: 0 }, { level: 0 },
])

export default function FeatureBento({ features }) {
  const sectionRef = useRef(null)

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        gsap.utils.toArray(".product-ui-card", sectionRef.current),
        { autoAlpha: 0.35, scale: 0.94, y: 36 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 72%" },
        },
      )
    })
    return () => media.revert()
  }, { scope: sectionRef })

  return (
    <section className="chapter features" id="fitur" aria-labelledby="features-title" ref={sectionRef}>
      <div className="chapter-heading chapter-heading--split">
        <div>
          <p className="eyebrow">Insight dan rencana dalam satu alur</p>
          <h2 id="features-title">Tampilan yang bekerja seperti Artami.</h2>
        </div>
        <p>
          Artami membaca catatan keuanganmu dari Google Sheet, lalu merangkum kondisi, penyebab, dan rencana berikutnya dalam satu tampilan.
        </p>
      </div>

      <div className="feature-panel-grid">
        <article className="feature-panel feature-panel--heatmap product-ui-card" aria-labelledby="heatmap-title" aria-describedby="heatmap-summary">
          <div className="feature-panel__meta"><span>01 / RITME</span><strong>Juli 2026 · contoh</strong></div>
          <h3 id="heatmap-title">Transaksimu terlihat dalam pola.</h3>
          <p className="feature-panel__intro">Satu bulan cukup untuk melihat kapan uang paling sering bergerak.</p>

          <div className="heatmap-axis" aria-hidden="true"><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span></div>
          <p className="heatmap-legend">Intensitas transaksi: rendah → tinggi</p>
          <div className="transaction-heatmap" aria-hidden="true">
            {HEATMAP_CELLS.map(({ level, label }, index) => (
              <span className={`heatmap-cell heatmap-cell--${level}`} key={`${level}-${index}`}>{label}</span>
            ))}
          </div>

          <p className="feature-panel__summary" id="heatmap-summary">
            <strong>Ringkasan aktivitas transaksi</strong> Transaksi paling padat terjadi di pertengahan bulan, dengan Jajan menjadi sinyal yang perlu diperhatikan.
          </p>
          <div className="heatmap-score">
            <div><span>Financial Health Score</span><small><TrendingUp aria-hidden="true" /> +6 dari bulan lalu</small></div>
            <strong>78</strong><b>Baik</b>
          </div>
        </article>

        <article className="feature-panel feature-panel--budget product-ui-card" aria-labelledby="budget-title">
          <div className="feature-panel__meta"><span>02 / RUANG GERAK</span><strong>3 aktif</strong></div>
          <h3 id="budget-title">Budget bulanan yang tetap terbaca.</h3>
          <p className="feature-panel__intro">Tahu ruang yang tersisa sebelum keputusan kecil jadi kebiasaan mahal.</p>

          <div className="budget-list">
            {[
              ["Kebutuhan", "Rp2,4 jt / Rp3 jt", "80%", 80],
              ["Jajan", "Rp1,42 jt / Rp1,5 jt", "95%", 95],
              ["Transportasi", "Rp620 rb / Rp1 jt", "62%", 62],
            ].map(([name, amount, pct, width], index) => (
              <div className="budget-row" key={name}>
                <div className={index === 1 ? "budget-icon budget-icon--alert" : "budget-icon"}>
                  {index === 1 ? <Utensils aria-hidden="true" /> : <span />}
                </div>
                <div><span>{name}<small>{amount}</small></span><div><i style={{ width: `${width}%` }} /></div></div>
                <strong>{pct}</strong>
              </div>
            ))}
          </div>
          <p className="feature-panel__summary"><strong>Jajan hampir penuh.</strong> Satu angka langsung menunjukkan kategori yang perlu kamu jaga minggu ini.</p>
        </article>

        <article className="feature-panel feature-panel--anomaly product-ui-card" aria-labelledby="anomaly-title">
          <div className="feature-panel__meta"><span>03 / SINYAL</span><CircleAlert aria-hidden="true" /></div>
          <h3 id="anomaly-title">Belanja yang keluar dari kebiasaan.</h3>
          <p className="feature-panel__intro">Artami membandingkan bulan ini dengan tiga bulan terakhir agar lonjakan kecil tidak luput.</p>

          <div className="anomaly-signal"><div className="anomaly-icon"><CircleAlert aria-hidden="true" /></div><span>Pengeluaran tidak biasa</span><strong>Jajan naik 42%</strong><p>Rp420.000 lebih tinggi dari rata-rata 3 bulan terakhir.</p></div>
          <div className="anomaly-comparison"><i style={{ width: "58%" }} /><i style={{ width: "86%" }} /></div>
          <div className="anomaly-labels"><span>Biasanya <b>Rp1 jt</b></span><span>Bulan ini <b>Rp1,42 jt</b></span></div>
          <p className="feature-panel__summary"><strong>Waktunya cek konteks.</strong> Kamu tetap memegang keputusan, dengan sinyal yang lebih mudah ditemukan.</p>
        </article>
      </div>

      <ul className="feature-caption-list">
        {features.map((feature) => (
          <li key={feature.id}><strong>{feature.title}</strong><span>{feature.description}</span></li>
        ))}
      </ul>
    </section>
  )
}
