"use client"

import { signIn, useSession } from "next-auth/react"

export default function AuthAwareLink({ children, className, href }) {
  const { data: session, status } = useSession()

  const handleClick = (event) => {
    if (status === "loading") return
    if (session) return

    event.preventDefault()
    void signIn("google", { callbackUrl: href })
  }

  return (
    <a className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  )
}
