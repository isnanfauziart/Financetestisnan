import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import "../landing.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-landing-sans",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-landing-mono",
})

export default function LandingLayout({ children }) {
  return <div className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>{children}</div>
}
