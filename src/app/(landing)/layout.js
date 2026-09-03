import { DM_Sans, Source_Serif_4 } from "next/font/google"
import "../landing.css"

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-landing-display",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-landing-body",
})

export default function LandingLayout({ children }) {
  return <div className={`${sourceSerif.variable} ${dmSans.variable}`}>{children}</div>
}
