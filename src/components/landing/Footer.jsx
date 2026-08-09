export default function Footer({ links }) {
  return (
    <footer className="site-footer">
      <div>
        <a className="wordmark" href="#awal">Artami</a>
        <p>Keuangan pribadi yang tenang, jelas, dan tetap berada di tanganmu.</p>
      </div>
      <nav aria-label="Tautan kebijakan">
        <a href={links.privacy}>Kebijakan Privasi</a>
        <a href={links.terms}>Syarat &amp; Ketentuan</a>
      </nav>
      <p className="copyright">&copy; {new Date().getFullYear()} Artami</p>
    </footer>
  )
}
