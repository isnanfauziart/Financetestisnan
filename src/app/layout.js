import { Playfair_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
})

export const metadata = {
  title: "Keuangan Isnan",
  description: "Dashboard Keuangan Pribadi",
  manifest: "/manifest.json",
}

export const viewport = {
  themeColor: "#6b5b4f",
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
