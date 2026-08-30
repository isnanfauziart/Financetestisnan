import {
  Database,
  EyeOff,
  FileSpreadsheet,
  Landmark,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

const TRUST_POINTS = [
  { icon: Landmark, title: "Tanpa koneksi bank", copy: "Tidak perlu menyerahkan kredensial rekening atau e-wallet." },
  { icon: EyeOff, title: "Tanpa menjual data", copy: "Tidak ada iklan dan transaksi tidak menjadi produk untuk pihak lain." },
  { icon: FileSpreadsheet, title: "Bisa kamu periksa", copy: "Catatan transaksi tetap terlihat langsung di Google Sheet milikmu." },
  { icon: LockKeyhole, title: "Izin file terbatas", copy: "Artami hanya bekerja pada file yang kamu izinkan untuk dipakai." },
]

export default function DataOwnership({ content }) {
  return (
    <section className="chapter ownership" id="privasi" aria-labelledby="ownership-title">
      <div className="ownership-intro" data-reveal="">
        <p className="eyebrow">Kepemilikan data sebagai fondasi</p>
        <h2 id="ownership-title">{content.headline}</h2>
        <p>{content.description}</p>
        <p>
          Artami mendapat akses terbatas setelah kamu memberikan izin, hanya untuk menjalankan fitur yang kamu gunakan.
        </p>
      </div>

      <div className="ownership-visual" data-reveal="" aria-label="Alur data Artami">
        <div className="sheet-stack">
          <div className="sheet-stack__back" />
          <div className="sheet-stack__front">
            <div><FileSpreadsheet /><span>Keuangan Saya</span><ShieldCheck /></div>
            <div className="sheet-grid">{Array.from({ length: 20 }, (_, index) => <i key={index} />)}</div>
            <small>Google Sheet di akunmu</small>
          </div>
        </div>
        <div className="ownership-lock">
          <LockKeyhole />
          <strong>Datamu,<br />hanya milikmu.</strong>
          <span>Akses terbatas untuk menghasilkan insight.</span>
        </div>
        <div className="insight-stack">
          <div><Database /><span>Database Artami</span></div>
          <strong>Tidak menyimpan transaksi</strong>
          <p>Artami membaca file yang kamu pilih saat fitur digunakan, lalu menampilkan hasilnya kepadamu.</p>
        </div>
      </div>

      <ul className="trust-list" data-reveal-group="">
        {TRUST_POINTS.map(({ icon: Icon, title, copy }) => (
          <li key={title}><Icon /><div><strong>{title}</strong><span>{copy}</span></div></li>
        ))}
      </ul>
    </section>
  )
}
