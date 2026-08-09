import { ArrowRight, Lightbulb, TrendingDown, TriangleAlert } from "lucide-react"

export default function FinancialBriefing() {
  return (
    <section className="chapter problem" aria-labelledby="problem-title">
      <div className="chapter-heading">
        <p className="eyebrow">Dari catatan menjadi keputusan</p>
        <h2 id="problem-title">Catatan ada. Keputusan belum.</h2>
      </div>

      <div className="problem-grid">
        <div className="decision-workspace" aria-hidden="true">
          <div className="decision-workspace__head">
            <div><span>Fokus bulan ini</span><strong>Menghindari lonjakan pengeluaran Jajan</strong></div>
            <span className="status-pill">Juli 2026 · contoh</span>
          </div>
          <div className="decision-signal">
            <div className="app-icon app-icon--red"><TriangleAlert /></div>
            <div><span>Yang berubah</span><strong>Jajan naik 42%</strong><small>Rp420.000 sudah di atas rata-rata Jajanmu selama tiga bulan terakhir</small></div>
          </div>
          <div className="decision-bridge"><ArrowRight /></div>
          <div className="decision-action">
            <div className="app-icon app-icon--yellow"><Lightbulb /></div>
            <div><span>Langkah paling berdampak</span><strong>Kurangi Rp300.000 bulan ini</strong><small>Budget kembali aman tanpa menyentuh alokasi lain</small></div>
          </div>
          <div className="decision-impact">
            <TrendingDown />
            <div><span>Dampak ke target</span><strong>HP baru tercapai 3 bulan lebih cepat</strong></div>
          </div>
        </div>
        <p className="sr-only">
          Contoh insight menunjukkan pengeluaran Jajan naik 42 persen, saran pengurangan Rp300.000 bulan ini, dan dampak target HP baru tercapai tiga bulan lebih cepat.
        </p>

        <div className="decision-copy">
          <article><span className="decision-number">01</span><div><h3>Artami menemukan sinyalnya.</h3><p>Bukan sekadar total, tetapi perubahan yang berbeda dari kebiasaanmu.</p></div></article>
          <article><span className="decision-number">02</span><div><h3>Kamu melihat pilihan terbaik.</h3><p>Saran dikaitkan langsung dengan budget, cash flow, dan tujuan yang sudah dibuat.</p></div></article>
          <article><span className="decision-number">03</span><div><h3>Keputusan tetap milikmu.</h3><p>Artami menjelaskan dampaknya. Kamu yang menentukan langkah berikutnya.</p></div></article>
          <p className="annotation">
            Artami menghubungkan angka dengan konteks, sehingga kamu tahu bukan hanya apa yang terjadi, tetapi juga apa yang bisa diubah.
          </p>
        </div>
      </div>
    </section>
  )
}
