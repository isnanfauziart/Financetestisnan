import { createEvent, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import AuthAwareLink from "@/components/landing/AuthAwareLink"
import Navigation from "@/components/landing/Navigation"

const authMock = vi.hoisted(() => ({
  signIn: vi.fn(),
  session: { data: null, status: "loading" },
}))

vi.mock("next-auth/react", () => ({
  signIn: authMock.signIn,
  useSession: () => authMock.session,
}))

const items = [{ label: "Fitur", href: "#fitur" }]
const links = { webApp: "/dashboard", upgrade: "/upgrade", playStore: null }

afterEach(() => {
  authMock.signIn.mockReset()
  authMock.session = { data: null, status: "loading" }
})

describe("landing navigation", () => {
  it("returns focus to the menu button when a mobile link closes the menu", () => {
    render(<Navigation items={items} links={links} />)

    const menuButton = screen.getByRole("button", { name: /buka navigasi/i })
    fireEvent.click(menuButton)
    fireEvent.click(within(document.getElementById("mobile-navigation")).getByRole("link", { name: "Fitur" }))

    expect(menuButton).toHaveAttribute("aria-expanded", "false")
    expect(document.activeElement).toBe(menuButton)
  })
})

describe("landing auth-aware links", () => {
  it("keeps native navigation available while the session is loading", () => {
    render(<AuthAwareLink href="#upgrade">Pilih Artami Pro</AuthAwareLink>)

    const link = screen.getByRole("link", { name: "Pilih Artami Pro" })
    const event = createEvent.click(link)
    const preventDefault = vi.spyOn(event, "preventDefault")

    fireEvent(link, event)

    expect(preventDefault).not.toHaveBeenCalled()
    expect(authMock.signIn).not.toHaveBeenCalled()
  })

  it("starts Google sign-in with the upgrade callback for signed-out visitors", () => {
    authMock.session = { data: null, status: "unauthenticated" }
    render(<AuthAwareLink href="/upgrade">Pilih Artami Pro</AuthAwareLink>)

    fireEvent.click(screen.getByRole("link", { name: "Pilih Artami Pro" }))

    expect(authMock.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/upgrade" })
  })
})
