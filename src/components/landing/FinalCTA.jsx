import { FileSpreadsheet } from "lucide-react"

export default function FinalCTA({ links }) {
  return (
    <section className="chapter final-cta" aria-labelledby="final-cta-title">
      <div className="final-cta__content" data-reveal-group="">
        <h2 id="final-cta-title">Baca keuanganmu.<br />Pilih langkah berikutnya.</h2>
        <p>Gunakan Artami di web hari ini. Aplikasi Android sedang dipersiapkan untuk Play Store.</p>
        <div className="button-row button-row--center">
          <a className="button" href={links.webApp}>Buka Artami</a>
          {links.playStoreAvailable ? (
            <a className="button button--ghost" href={links.playStore}>Unduh di Play Store</a>
          ) : (
            <span className="store-status" aria-disabled="true">Segera hadir di Play Store</span>
          )}
        </div>
      </div>

      <div className="final-cta__flow" aria-hidden="true" data-reveal="">
        <span className="final-cta__step"><FileSpreadsheet />Google Sheet-mu</span>
        <i />
        <span className="final-cta__step">Pemahaman</span>
        <i />
        <span className="final-cta__step">Keputusan berikutnya</span>
      </div>
    </section>
  )
}
