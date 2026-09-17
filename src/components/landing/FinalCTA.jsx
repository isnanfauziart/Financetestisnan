import { ArrowUpRight } from "lucide-react"

export default function FinalCTA({ links }) {
  return (
    <section className="chapter final-cta" aria-labelledby="final-cta-title">
      <div className="final-cta__panel">
        <div className="final-cta__content" data-reveal-group="">
          <h2 id="final-cta-title">
            <span>Lebih paham uangmu.</span>
            <span>Lebih jelas langkahmu.</span>
          </h2>
          <p>
            Catat pemasukan, pantau pengeluaran, dan susun rencana. Semuanya terhubung ke Google Sheet milikmu.
          </p>
          <div className="button-row">
            <a className="button final-cta__primary" href={links.webApp}>
              Mulai gratis
              <ArrowUpRight aria-hidden="true" />
            </a>
            {links.playStoreAvailable ? (
              <a className="button final-cta__secondary" href={links.playStore}>Unduh di Play Store</a>
            ) : null}
          </div>
        </div>

        <div className="final-cta__artwork" aria-hidden="true">
          <svg viewBox="0 0 640 640" focusable="false">
            <circle cx="455" cy="320" r="320" fill="#c4dcd3" />
            <circle cx="455" cy="320" r="256" fill="#b0cec2" />
            <circle cx="455" cy="320" r="192" fill="#99bcad" />
            <circle cx="455" cy="320" r="128" fill="#7fa694" />
            <circle cx="455" cy="320" r="64" fill="#658e7d" />
          </svg>
        </div>
      </div>
    </section>
  )
}
