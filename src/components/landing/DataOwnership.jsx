import { Database, EyeOff, FileKey, FileSpreadsheet, Landmark, ShieldCheck } from "lucide-react"

const TRUST_POINTS = [
  { icon: Landmark, title: "Tanpa koneksi bank", copy: "Tidak perlu menyerahkan kredensial rekening atau e-wallet." },
  { icon: FileKey, title: "Izin file terbatas", copy: "Artami hanya bekerja pada file yang kamu pilih melalui drive.file." },
  { icon: EyeOff, title: "Tanpa menjual data", copy: "Tidak ada iklan dan catatan transaksi tidak dijadikan produk." },
]

export default function DataOwnership({ content }) {
  return (
    <section className="privacy-story chapter" id="privasi" aria-labelledby="ownership-title">
      <div className="privacy-story__copy" data-reveal="">
        <h2 id="ownership-title">Kami tidak menyimpan data transaksimu.</h2>
        <p className="privacy-story__lead">{content.headline} {content.description}</p>
        <p>Artami mendapat akses terbatas setelah kamu memberikan izin, hanya untuk menjalankan fitur yang sedang kamu gunakan.</p>
        <a href="#faq">Pelajari cara aksesnya <span aria-hidden="true">→</span></a>
      </div>

      <div className="privacy-story__visual" data-reveal="" aria-label="Alur kepemilikan data Artami">
        <div className="privacy-sheet-card">
          <header><FileSpreadsheet /><span>Keuangan Saya<small>Google Sheet di akunmu</small></span><ShieldCheck /></header>
          <div className="privacy-sheet-grid" aria-hidden="true">
            {Array.from({ length: 28 }, (_, index) => <i className={index === 10 || index === 17 ? "is-filled" : ""} key={index} />)}
          </div>
          <footer><span>Pemasukan</span><span>Pengeluaran</span><span>Tabungan</span></footer>
        </div>

        <div className="privacy-access-card">
          <FileKey />
          <div><span>Akses Artami</span><strong>Hanya file yang kamu izinkan</strong><small>Bisa dicabut kapan saja dari akun Google-mu.</small></div>
        </div>

        <div className="privacy-database-card">
          <Database />
          <div><span>Database transaksi Artami</span><strong>Tidak menyimpan salinan transaksi</strong></div>
        </div>
      </div>

      <div className="privacy-story__trust" data-reveal-group="" data-reveal-stagger="0.08">
        {TRUST_POINTS.map(({ icon: Icon, title, copy }) => <article key={title}><Icon /><div><strong>{title}</strong><p>{copy}</p></div></article>)}
      </div>
    </section>
  )
}
