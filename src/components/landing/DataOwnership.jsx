import { Ban, EyeOff, FileKey, FileSpreadsheet, Landmark, ShieldCheck, Sparkles } from "lucide-react"

const SHEET_ROWS = [
  { label: "Sedekah Jumat", category: "Sedekah", amount: "-Rp50.000", tone: "is-negative" },
  { label: "Belanja bulanan", category: "Kebutuhan", amount: "-Rp420.000", tone: "is-negative" },
  { label: "Freelance — desain", category: "Pemasukan", amount: "+Rp1.200.000", tone: "is-positive" },
  { label: "Arisan keluarga", category: "Tabungan", amount: "+Rp100.000", tone: "is-positive" },
]

const SHEET_TABS = [
  { label: "Pemasukan", tone: "is-income" },
  { label: "Pengeluaran", tone: "is-expense" },
  { label: "Tabungan", tone: "is-savings" },
]

const ZERO_STATS = [
  { value: "1", label: "file saja yang diizinkan" },
  { value: "100%", label: "akses bisa kamu cabut sendiri" },
  { value: "Rp0", label: "dari iklan & menjual data" },
]

const STEP_MOCK_ROWS = [
  { label: "Jajan — Kopi", amount: "-Rp25.000", tone: "is-negative" },
  { label: "Gaji bulanan", amount: "+Rp6.500.000", tone: "is-positive" },
  { label: "Tabungan — HP baru", amount: "+Rp300.000", tone: "is-neutral" },
]

const TRUST_POINTS = [
  { icon: Landmark, tone: "is-sage", title: "Tanpa koneksi bank", copy: "Tidak perlu menyerahkan kredensial rekening atau e-wallet." },
  { icon: FileKey, tone: "is-peach", title: "Izin file terbatas", copy: "Artami hanya bekerja pada file yang kamu pilih melalui drive.file." },
  { icon: EyeOff, tone: "is-lilac", title: "Tanpa menjual data", copy: "Tidak ada iklan dan catatan transaksi tidak dijadikan produk." },
]

export default function DataOwnership({ content }) {
  return (
    <section className="privacy-story chapter" id="privasi" aria-labelledby="ownership-title">
      <div className="privacy-story__top">
        <div className="privacy-story__copy" data-reveal="">
          <p className="eyebrow">Privasi</p>
          <h2 id="ownership-title">Kami tidak menyimpan data transaksimu.</h2>
          <p className="privacy-story__lead">{content.headline} {content.description}</p>
          <p>Artami mendapat akses terbatas setelah kamu memberikan izin, hanya untuk menjalankan fitur yang sedang kamu gunakan.</p>
          <a href="#faq">Pelajari cara aksesnya <span aria-hidden="true">→</span></a>

          <div className="privacy-zero">
            <span className="privacy-zero__number" aria-hidden="true">0</span>
            <div className="privacy-zero__body">
              <strong>transaksi disimpan di server Artami.</strong>
              <p>Bukan sekadar janji — memang begitu arsitekturnya. Catatanmu dibaca dari Sheet-mu saat fitur dipakai, tanpa disalin untuk disimpan.</p>
              <ul className="privacy-zero__stats">
                {ZERO_STATS.map(({ value, label }) => (
                  <li key={label}><strong>{value}</strong><span>{label}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="privacy-sheet-card" data-reveal="" aria-label="Contoh file Google Sheet milik pengguna">
          <header>
            <span className="privacy-sheet-card__mark"><FileSpreadsheet /></span>
            <span>Keuangan Saya<small>Google Sheet di akunmu</small></span>
            <span className="privacy-sheet-card__badge">Contoh</span>
            <ShieldCheck />
          </header>
          <div className="privacy-sheet-rows">
            {SHEET_ROWS.map(({ label, category, amount, tone }) => (
              <div className="privacy-sheet-row" key={label}>
                <span>{label}</span>
                <span className="privacy-sheet-row__category">{category}</span>
                <strong className={tone}>{amount}</strong>
              </div>
            ))}
          </div>
          <footer>
            {SHEET_TABS.map(({ label, tone }) => (
              <span key={label}><i className={tone} aria-hidden="true" />{label}</span>
            ))}
          </footer>
        </div>
      </div>

      <ol className="privacy-steps" data-reveal-group="" data-reveal-stagger="0.08" aria-label="Alur kepemilikan data Artami">
        <li className="privacy-step privacy-step--sheet">
          <span className="privacy-step__ghost" aria-hidden="true">1</span>
          <div className="privacy-step__top">
            <span className="privacy-step__icon"><FileSpreadsheet /></span>
            <span className="privacy-step__num">Langkah 01</span>
          </div>
          <h3>Sheet-mu, rumah datanya</h3>
          <p>Semua transaksi tinggal di 1 file Google Sheet di akun Google-mu — bukan di server kami.</p>
          <div className="privacy-step__micro" aria-hidden="true">
            {STEP_MOCK_ROWS.map(({ label, amount, tone }) => (
              <span className="privacy-step__row" key={label}><span>{label}</span><b className={tone}>{amount}</b></span>
            ))}
          </div>
        </li>

        <li className="privacy-step privacy-step--permission">
          <span className="privacy-step__ghost" aria-hidden="true">2</span>
          <div className="privacy-step__top">
            <span className="privacy-step__icon"><FileKey /></span>
            <span className="privacy-step__num">Langkah 02</span>
          </div>
          <h3>Izin hanya 1 file</h3>
          <p>Artami masuk lewat izin drive.file — file lain di Drive-mu tidak terlihat, tidak tersentuh.</p>
          <div className="privacy-step__micro">
            <span className="privacy-toggle"><i aria-hidden="true" />Izin aktif · drive.file</span>
            <span className="privacy-step__chips">
              <span>Hanya 1 file</span><span>Cabut: 2 klik</span><span>Tanpa login bank</span>
            </span>
          </div>
        </li>

        <li className="privacy-step privacy-step--insight">
          <span className="privacy-step__ghost" aria-hidden="true">3</span>
          <div className="privacy-step__top">
            <span className="privacy-step__icon"><Sparkles /></span>
            <span className="privacy-step__num">Langkah 03</span>
          </div>
          <h3>Artami membaca, lalu merangkum</h3>
          <p>Saat kamu membuka fitur, catatan dibaca untuk jadi insight — dibaca, bukan disalin pulang.</p>
          <div className="privacy-step__micro">
            <div className="privacy-step__health">
              <span>Health Score <strong>78 / 100</strong></span>
              <i aria-hidden="true"><b /></i>
              <small>Budget Jajan 62% · dihitung dari Sheet-mu</small>
            </div>
          </div>
        </li>

        <li className="privacy-step privacy-step--stored">
          <span className="privacy-step__ghost" aria-hidden="true">0</span>
          <div className="privacy-step__top">
            <span className="privacy-step__icon"><Ban /></span>
            <span className="privacy-step__num">Hasil akhir</span>
          </div>
          <h3>Disimpan Artami: nol</h3>
          <p>Tidak ada database transaksi, tidak ada salinan, tidak ada backup tersembunyi di pihak kami.</p>
          <div className="privacy-step__micro">
            <div className="privacy-step__empty" aria-hidden="true">
              {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
            </div>
            <span className="privacy-step__zero-chip">0 transaksi · 0 salinan</span>
          </div>
        </li>
      </ol>

      <div className="privacy-story__trust" data-reveal-group="" data-reveal-stagger="0.08">
        {TRUST_POINTS.map(({ icon: Icon, tone, title, copy }) => (
          <article key={title}>
            <span className={`privacy-story__trust-icon ${tone}`}><Icon /></span>
            <div><strong>{title}</strong><p>{copy}</p></div>
          </article>
        ))}
      </div>
    </section>
  )
}
