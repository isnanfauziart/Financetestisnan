import { beforeEach, describe, expect, it, vi } from "vitest"

const fromMock = vi.fn()

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}))

function makeSelectChain(result) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
      })),
      or: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
      })),
    })),
  }
}

function makeUpdateChain() {
  return {
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  }
}

describe("getOrCreateUser", () => {
  beforeEach(() => {
    vi.resetModules()
    fromMock.mockReset()
  })

  it("normalizes email for lookup and insert", async () => {
    const selectSingle = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } })
    const insertSingle = vi.fn().mockResolvedValue({
      data: { id: "u1", email: "user@example.com", name: "User" },
      error: null,
    })

    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          or: vi.fn(() => ({ single: selectSingle })),
          eq: vi.fn(() => ({ single: selectSingle })),
        })),
      })
      .mockReturnValueOnce({
        insert: vi.fn(payload => {
          expect(payload.email).toBe("user@example.com")
          return {
            select: vi.fn(() => ({ single: insertSingle })),
          }
        }),
      })

    const { getOrCreateUser } = await import("@/lib/user")
    await getOrCreateUser({ email: "User@Example.com", name: "User", avatarUrl: "", googleId: "gid-1" })

    expect(selectSingle).toHaveBeenCalled()
  })

  it("re-reads and returns the user on duplicate insert races", async () => {
    const duplicateErr = { code: "23505", message: "duplicate key value violates unique constraint" }
    const racedUser = { id: "u2", email: "user@example.com", name: "User" }

    fromMock
      .mockReturnValueOnce(makeSelectChain({ data: null, error: { code: "PGRST116" } }))
      .mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: duplicateErr }),
          })),
        })),
      })
      .mockReturnValueOnce(makeSelectChain({ data: racedUser, error: null }))

    const { getOrCreateUser } = await import("@/lib/user")
    const result = await getOrCreateUser({ email: "user@example.com", name: "User", avatarUrl: "", googleId: "gid-1" })

    expect(result).toEqual(racedUser)
  })

  it("updates changed profile fields for existing users", async () => {
    const existing = { id: "u3", email: "user@example.com", name: "Old", avatar_url: "old.png" }
    const updateEq = vi.fn().mockResolvedValue({ error: null })

    fromMock
      .mockReturnValueOnce(makeSelectChain({ data: existing, error: null }))
      .mockReturnValueOnce({
        update: vi.fn(() => ({ eq: updateEq })),
      })

    const { getOrCreateUser } = await import("@/lib/user")
    const result = await getOrCreateUser({ email: "user@example.com", name: "New", avatarUrl: "new.png", googleId: "gid-1" })

    expect(result).toEqual(existing)
    expect(updateEq).toHaveBeenCalledWith("id", "u3")
  })
})
