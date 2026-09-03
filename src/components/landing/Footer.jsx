const GROUPS = [
  {
    title: "Produk",
    items: [
      { label: "Produk", href: "#produk" },
      { label: "Kecerdasan", href: "#kecerdasan" },
      { label: "Harga", href: "#harga" },
    ],
  },
  {
    title: "Pelajari",
    items: [
      { label: "Privasi", href: "#privasi" },
      { label: "FAQ", href: "#faq" },
    ],
  },
]

export default function Footer({ links }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <a className="wordmark wordmark--large" href="#awal">Artami</a>
        <p>Keuangan pribadi yang tenang, jelas, dan tetap berada di tanganmu.</p>
      </div>

      <nav className="site-footer__directory" aria-label="Tautan footer">
        {GROUPS.map((group) => (
          <div className="site-footer__group" key={group.title}>
            <h3>{group.title}</h3>
            {group.items.map(({ label, href }) => (
              <a key={href} href={href}>{label}</a>
            ))}
          </div>
        ))}

        <div className="site-footer__group">
          <h3>Legal</h3>
          <a href={links.privacy}>Kebijakan Privasi</a>
          <a href={links.terms}>Syarat &amp; Ketentuan</a>
        </div>

        <div className="site-footer__group">
          <h3>Akses</h3>
          <a href={links.webApp}>Buka Artami</a>
          <p className="site-footer__store-status">Android · segera hadir di Play Store</p>
        </div>
      </nav>

      <div className="site-footer__base">
        <p>&copy; {new Date().getFullYear()} Artami · Dibuat untuk pengguna di Indonesia</p>
      </div>
    </footer>
  )
}
