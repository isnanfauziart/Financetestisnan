"use client"

import { useState } from "react"
import { ChartNoAxesCombined, ListChecks, ShieldCheck } from "lucide-react"

const PILLARS = [
  {
    icon: ChartNoAxesCombined,
    title: "Baca pola",
    copy: "Lihat perubahan, kebiasaan, dan sinyal penting tanpa membongkar baris demi baris.",
    visual: "bars",
    tone: "peach",
  },
  {
    icon: ListChecks,
    title: "Susun rencana",
    copy: "Hubungkan budget, tujuan, tagihan, dan momen besar dalam satu alur yang masuk akal.",
    visual: "plan",
    tone: "lilac",
  },
  {
    icon: ShieldCheck,
    title: "Tetap punya kendali",
    copy: "Catatan transaksi tetap berada di Google Sheet milikmu dengan izin file yang terbatas.",
    visual: "sheet",
    tone: "sage",
  },
]

function SheetMark() {
  return <span className="pillar-sheet-mark"><i /><i /><i /><i /><i /><i /></span>
}

export default function PlatformPillars() {
  const [activePillar, setActivePillar] = useState(0)

  return (
    <section className="platform-pillars chapter" aria-labelledby="pillars-title">
      <div className="platform-pillars__heading" data-reveal="">
        <h2 id="pillars-title">Cara baru membaca keuangan pribadi.</h2>
      </div>

      <div className="platform-pillars__grid" data-reveal-group="" data-reveal-stagger="0.08">
        {PILLARS.map(({ icon: Icon, title, copy, visual, tone }, index) => {
          const isActive = activePillar === index

          return (
          <article
            className={`pillar-card pillar-card--${tone}${isActive ? " is-active" : ""}`}
            data-active={isActive ? "true" : "false"}
            key={title}
            onMouseEnter={() => setActivePillar(index)}
            onFocusCapture={() => setActivePillar(index)}
          >
            <button
              className="pillar-card__trigger"
              type="button"
              aria-label={`Aktifkan: ${title}`}
              aria-pressed={isActive}
              onClick={() => setActivePillar(index)}
            />
            <div className="pillar-card__copy">
              <span className="pillar-card__icon" aria-hidden="true"><Icon /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
            <div className={`pillar-visual pillar-visual--${visual}`} aria-hidden="true">
              {visual === "bars" ? <><i style={{ height: "42%" }} /><i style={{ height: "68%" }} /><i style={{ height: "54%" }} /><i style={{ height: "88%" }} /><i style={{ height: "72%" }} /></> : null}
              {visual === "plan" ? <><span><b>Budget Jajan</b><small>95%</small></span><i><b style={{ width: "95%" }} /></i><span><b>HP Baru</b><small>42%</small></span><i><b style={{ width: "42%" }} /></i></> : null}
              {visual === "sheet" ? <><SheetMark /><span>Keuangan Saya</span><small>File di akun Google-mu</small></> : null}
            </div>
          </article>
          )
        })}
      </div>
    </section>
  )
}
