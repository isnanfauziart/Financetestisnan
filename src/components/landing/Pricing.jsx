import { Check, Sparkles } from "lucide-react"
import AuthAwareLink from "./AuthAwareLink"

const COMPARISON = [
  ["Transaksi bulanan", "75 transaksi", "Tanpa batas"],
  ["Riwayat keuangan", "4 bulan", "Seluruh riwayat"],
  ["Budget dan tujuan", "3 budget · 1 tujuan", "Tanpa batas"],
  ["Smart insights", "3 per minggu", "Tanpa batas"],
  ["Health Score & forecast", "—", "Termasuk"],
  ["Peringatan anomali", "—", "Termasuk"],
]

export default function Pricing({ plans, links }) {
  const free = plans.find((plan) => plan.id === "gratis")
  const pro = plans.find((plan) => plan.id === "lifetime")

  return (
    <section className="chapter pricing" id="harga" aria-labelledby="pricing-title">
      <div className="chapter-heading chapter-heading--split" data-reveal="">
        <div>
          <p className="eyebrow">Mulai sesuai kebutuhanmu</p>
          <h2 id="pricing-title">Bayar sekali. Pakai seterusnya.</h2>
        </div>
        <p>Tidak ada biaya bulanan, biaya berulang, atau iklan yang mengganggu catatanmu.</p>
      </div>

      <div className="pricing-stage">
        <article className="price-card price-card--free" data-reveal="">
          <div><span className="plan-kicker">Untuk mulai mencatat</span><h3>{free.name}</h3><p className="price">{free.price}</p></div>
          <p>{free.detail}</p>
          <a className="button button--outline" href={links.webApp}>Mulai gratis</a>
        </article>

        <article className="price-card price-card--featured" data-reveal="">
          <div className="pro-badge"><Sparkles /> Pilihan lengkap</div>
          <div>
            <span className="plan-kicker">Sekali bayar, selamanya</span>
            <h3>{pro.name}</h3>
            <p className="price">{pro.price}</p>
            <p className="price-emphasis">{pro.emphasis}</p>
          </div>
          <ul className="pro-highlights">
            {[
              "Semua fitur tanpa batas",
              "Health Score dan proyeksi cash flow",
              "Anomaly alert dan insight lengkap",
              "Tanpa iklan, tanpa biaya bulanan",
            ].map((item) => <li key={item}><Check />{item}</li>)}
          </ul>
          <AuthAwareLink className="button button--paper" href={links.upgrade}>Pilih Artami Pro</AuthAwareLink>
          <p className="price-note">Sekali bayar via QRIS. Pro aktif setelah pembayaran diverifikasi - tanpa tagihan berulang.</p>
        </article>

        <table className="price-comparison">
          <caption className="sr-only">Perbandingan Artami Gratis dan Pro</caption>
          <thead>
            <tr className="comparison-head">
              <th scope="col">Yang kamu dapat</th>
              <th scope="col">Gratis</th>
              <th scope="col">Pro</th>
            </tr>
          </thead>
          <tbody data-reveal-group="" data-reveal-stagger="0.05">
            {COMPARISON.map(([feature, freeValue, proValue]) => (
              <tr className="comparison-row" key={feature}>
                <th scope="row">{feature}</th>
                <td>{freeValue}</td>
                <td>{proValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
