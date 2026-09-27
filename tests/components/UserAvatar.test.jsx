import { describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import UserAvatar from "@/components/UserAvatar"

describe("UserAvatar (Wave 10 avatar fallback)", () => {
  it("renders the user's image when a src is provided", () => {
    const { container } = render(
      <UserAvatar src="https://example.com/photo.jpg" name="Budi Santoso" email="budi@example.com" className="w-11 h-11" />,
    )

    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg")
    expect(img).toHaveAttribute("alt", "")
  })

  it("falls back to deterministic initials when there is no image", () => {
    render(<UserAvatar src={null} name="Budi Santoso" email="budi@example.com" className="w-24 h-24" />)

    expect(screen.getByText("BS")).toBeInTheDocument()
    expect(screen.queryByRole("img")).toBeNull()
  })

  it("falls back to initials on image load error", () => {
    const { container } = render(
      <UserAvatar src="https://example.com/broken.jpg" name="Budi Santoso" email="budi@example.com" />,
    )

    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    fireEvent.error(img)
    expect(screen.getByText("BS")).toBeInTheDocument()
  })

  it("uses the first initial of the email when no name is available", () => {
    render(<UserAvatar src={null} name="" email="budi@example.com" />)

    expect(screen.getByText("B")).toBeInTheDocument()
  })

  it("falls back to a neutral initial when neither name nor email exists", () => {
    render(<UserAvatar src={null} name="" email="" />)

    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("keeps the initials deterministic for the same user", () => {
    const first = render(<UserAvatar src={null} name="Budi Santoso" email="budi@example.com" />)
    const second = render(<UserAvatar src={null} name="Budi Santoso" email="budi@example.com" />)

    expect(first.container.textContent).toContain("BS")
    expect(second.container.textContent).toContain("BS")
  })

  it("excludes the avatar from the accessibility tree (name comes from context)", () => {
    const { container } = render(<UserAvatar src={null} name="Budi Santoso" email="budi@example.com" />)

    expect(container.firstElementChild.getAttribute("aria-hidden")).toBe("true")
  })
})
