import { ArrowRight, FileSpreadsheet, Landmark, Lightbulb } from "lucide-react"

export default function FinalCTA({ links }) {
  return (
    <section className="chapter final-cta" aria-labelledby="final-cta-title">
      <div className="final-cta__content" data-reveal-group="">
        <p className="eyebrow">Mulai dari catatan yang sudah kamu punya</p>
        <h2 id="final-cta-title">Baca keuanganmu. Pilih langkah berikutnya.</h2>
        <p>Gunakan Artami di web hari ini. Aplikasi Android sedang dipersiapkan untuk Play Store.</p>
        <div className="button-row button-row--center">
          <a className="button button--paper" href={links.webApp}>Buka Artami</a>
          {links.playStoreAvailable ? (
            <a className="button button--ghost" href={links.playStore}>Unduh di Play Store</a>
          ) : (
            <span className="store-status" aria-disabled="true">Segera hadir di Play Store</span>
          )}
        </div>
      </div>

      <div className="cta-evidence" aria-hidden="true">
        <article className="cta-evidence__item">
          <FileSpreadsheet />
          <span>Data di Sheet kamu sendiri</span>
        </article>
        <article className="cta-evidence__item">
          <Landmark />
          <span>Tanpa koneksi bank</span>
        </article>
        <article className="cta-evidence__item cta-evidence__item--flow">
          <FileSpreadsheet /><ArrowRight /><Lightbulb /><ArrowRight /><span>Keputusan</span>
          <small>Catatan → Insight → Keputusan</small>
        </article>
      </div>
    </section>
  )
}
