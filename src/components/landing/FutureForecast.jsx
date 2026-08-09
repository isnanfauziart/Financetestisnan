export default function FutureForecast() {
  return (
    <section className="chapter forecast-chapter" id="prediksi" aria-labelledby="forecast-title">
      <div className="forecast-chapter__intro">
        <p className="eyebrow">Melihat langkah berikutnya</p>
        <h2 id="forecast-title">Prediksi masa depanmu</h2>
        <p>
          Lihat proyeksi keuanganmu untuk tiga bulan ke depan, lalu pahami seberapa dekat kebiasaan hari ini membawamu menuju kemandirian finansial.
        </p>
      </div>

      <div className="forecast-chapter__grid">
        <div className="forecast-metrics" aria-label="Ringkasan proyeksi 90 hari">
          <article className="forecast-metric">
            <h3>Personal Independence Index</h3>
            <strong>63 <small>/ 100</small></strong>
            <p>Indeks ilustratif dari kebiasaan yang sedang kamu bangun.</p>
          </article>
          <article className="forecast-metric forecast-metric--clay">
            <h3>Arus kas 90 hari</h3>
            <strong>+Rp2,4 jt</strong>
            <p>Estimasi akhir periode berdasarkan pola transaksi saat ini.</p>
          </article>
        </div>

        <div className="forecast-timeline">
          <div className="forecast-timeline__head"><span>Proyeksi ilustratif</span><strong>90 hari</strong></div>
          <svg viewBox="0 0 720 250" role="img" aria-label="Proyeksi arus kas 90 hari" aria-describedby="forecast-chart-summary">
            <path className="forecast-timeline__grid" d="M20 50H700 M20 115H700 M20 180H700" />
            <path className="forecast-timeline__line" d="M20 171 C112 157, 142 163, 205 145 S316 147, 365 120 S472 126, 527 91 S632 81, 700 52" />
            <path className="forecast-timeline__line forecast-timeline__line--dashed" d="M527 91 C588 73, 643 61, 700 52" />
            <circle cx="20" cy="171" r="7" />
            <circle cx="248" cy="143" r="7" />
            <circle cx="475" cy="111" r="7" />
            <circle cx="700" cy="52" r="7" />
          </svg>
          <p id="forecast-chart-summary" className="forecast-timeline__summary">
            Ilustrasi 90 hari: arus kas bergerak dari hari ini menuju surplus sekitar Rp2,4 juta pada akhir periode. Ini adalah estimasi, bukan jaminan hasil.
          </p>
          <ol className="forecast-milestones">
            <li><span>Hari ini</span><strong>Pola saat ini</strong></li>
            <li><span>30 hari</span><strong>Mulai stabil</strong></li>
            <li><span>60 hari</span><strong>Ruang bertambah</strong></li>
            <li><span>90 hari</span><strong>+Rp2,4 jt</strong></li>
          </ol>
        </div>
      </div>
    </section>
  )
}
