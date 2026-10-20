import { Download, RefreshCw, ShieldCheck, Smartphone } from "lucide-react"

export default function AndroidDownload({ content, links }) {
  return (
    <section className="chapter android-download" id="android" aria-labelledby="android-download-title">
      <div className="android-download__grid">
        <div className="android-download__copy" data-reveal="">
          <p className="eyebrow">{content.eyebrow}</p>
          <h2 id="android-download-title">{content.title}</h2>
          <p className="android-download__lead">{content.description}</p>

          <ul className="android-download__meta" aria-label="Detail aplikasi Android">
            <li>{content.version}</li>
            <li>{content.size}</li>
            <li>Android</li>
          </ul>

          <div className="button-row android-download__actions">
            <a className="button android-download__cta" href={links.androidApk}>
              <Download aria-hidden="true" />
              Download APK Android
            </a>
            <a className="text-link" href={links.webApp}>
              Atau buka versi web <span aria-hidden="true">→</span>
            </a>
          </div>

          <p className="android-download__note">
            <ShieldCheck aria-hidden="true" />
            Download hanya dari artami.web.id — jangan pasang APK Artami dari situs lain.
          </p>
        </div>

        <div className="android-download__panel" data-reveal="">
          <div className="android-download__app">
            <img src="/icons/icon-512.png" alt="" width="72" height="72" />
            <div>
              <strong>Artami</strong>
              <span>
                {content.version} · {content.size}
              </span>
              <small>{content.packageId}</small>
            </div>
            <Smartphone aria-hidden="true" />
          </div>

          <ol className="android-download__steps">
            {content.steps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="android-download__update">
            <RefreshCw aria-hidden="true" />
            {content.updateNote}
          </p>
        </div>
      </div>
    </section>
  )
}
