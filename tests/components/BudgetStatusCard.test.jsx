import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import BudgetStatusCard from "@/components/BudgetStatusCard"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"

afterEach(() => cleanup())

const currentMonth = AVAILABLE_MONTHS[new Date().getMonth()]
const currentYear = String(new Date().getFullYear())

function mockBudgetsResponse(budgets = []) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ budgets }),
    })
  )
}

function mockFailedResponse() {
  global.fetch = vi.fn(() => Promise.reject(new Error("network error")))
}

describe("BudgetStatusCard", () => {
  beforeEach(() => {
    mockBudgetsResponse()
  })

  it("fetches /api/budgets with current month and year on mount", async () => {
    render(<BudgetStatusCard filteredTransactions={[]} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
    const calledUrl = global.fetch.mock.calls[0][0]
    expect(calledUrl).toContain("/api/budgets?")
    expect(calledUrl).toContain(`month=${currentMonth}`)
    expect(calledUrl).toContain(`year=${currentYear}`)
  })

  it("renders nothing when no budgets exist", async () => {
    mockBudgetsResponse([])
    const { container } = render(<BudgetStatusCard filteredTransactions={[]} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it("renders shimmer skeleton during loading", () => {
    let resolveFetch
    global.fetch = vi.fn(() => new Promise(r => { resolveFetch = r }))
    const { container } = render(<BudgetStatusCard filteredTransactions={[]} setActiveNav={vi.fn()} />)
    expect(container.querySelector(".shimmer-bg")).toBeInTheDocument()
    resolveFetch({ ok: true, json: () => Promise.resolve({ budgets: [] }) })
  })

  it("renders 'all healthy' message when budgets exist but none over 70%", async () => {
    mockBudgetsResponse([{ kategori: "Makanan", limit: 1000000, bulan: currentMonth, tahun: currentYear, akun: "" }])
    render(<BudgetStatusCard filteredTransactions={[]} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Semua budget sehat bulan ini/i)).toBeInTheDocument()
    })
  })

  it("renders 'over' summary chip when any budget >= 100%", async () => {
    const budgets = [
      { kategori: "Makanan", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
    ]
    const txns = [{ type: "expense", category: "Makanan", amount: 150000, account: "" }]
    mockBudgetsResponse(budgets)
    render(<BudgetStatusCard filteredTransactions={txns} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText("1 over")).toBeInTheDocument()
    })
  })

  it("renders 'hampir' summary chip when budget is 90-99%", async () => {
    const budgets = [
      { kategori: "Transport", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
    ]
    const txns = [{ type: "expense", category: "Transport", amount: 95000, account: "" }]
    mockBudgetsResponse(budgets)
    render(<BudgetStatusCard filteredTransactions={txns} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText("1 hampir")).toBeInTheDocument()
    })
  })

  it("computes spent from filteredTransactions correctly", async () => {
    const budgets = [
      { kategori: "Makanan", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
    ]
    const txns = [
      { type: "expense", category: "Makanan", amount: 50000, account: "" },
      { type: "expense", category: "Makanan", amount: 30000, account: "" },
      { type: "income", category: "Makanan", amount: 99999, account: "" },
    ]
    mockBudgetsResponse(budgets)
    render(<BudgetStatusCard filteredTransactions={txns} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/80%/)).toBeInTheDocument()
    })
  })

  it("renders top 3 most urgent budgets (sorted by % desc)", async () => {
    const budgets = [
      { kategori: "Makanan", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
      { kategori: "Transport", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
      { kategori: "Hiburan", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
      { kategori: "Belanja", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
    ]
    const txns = [
      { type: "expense", category: "Makanan", amount: 85000, account: "" },
      { type: "expense", category: "Transport", amount: 100000, account: "" },
      { type: "expense", category: "Hiburan", amount: 90000, account: "" },
      { type: "expense", category: "Belanja", amount: 80000, account: "" },
    ]
    mockBudgetsResponse(budgets)
    render(<BudgetStatusCard filteredTransactions={txns} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText("Transport")).toBeInTheDocument()
      expect(screen.getByText("Hiburan")).toBeInTheDocument()
      expect(screen.getByText("Makanan")).toBeInTheDocument()
      expect(screen.queryByText("Belanja")).toBeNull()
    })
  })

  it("click on budget row calls setActiveNav('stats')", async () => {
    const setActiveNav = vi.fn()
    const budgets = [
      { kategori: "Makanan", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
    ]
    const txns = [{ type: "expense", category: "Makanan", amount: 95000, account: "" }]
    mockBudgetsResponse(budgets)
    render(<BudgetStatusCard filteredTransactions={txns} setActiveNav={setActiveNav} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/Open Makanan budget details/i)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByLabelText(/Open Makanan budget details/i))
    expect(setActiveNav).toHaveBeenCalledWith("stats")
  })

  it("click on 'Detail' button calls setActiveNav('stats')", async () => {
    const setActiveNav = vi.fn()
    const budgets = [
      { kategori: "Makanan", limit: 100000, bulan: currentMonth, tahun: currentYear, akun: "" },
    ]
    const txns = [{ type: "expense", category: "Makanan", amount: 95000, account: "" }]
    mockBudgetsResponse(budgets)
    render(<BudgetStatusCard filteredTransactions={txns} setActiveNav={setActiveNav} />)
    await waitFor(() => {
      expect(screen.getByLabelText(/Open budget details in Statistics/i)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByLabelText(/Open budget details in Statistics/i))
    expect(setActiveNav).toHaveBeenCalledWith("stats")
  })

  it("handles fetch error gracefully (renders nothing)", async () => {
    mockFailedResponse()
    const { container } = render(<BudgetStatusCard filteredTransactions={[]} setActiveNav={vi.fn()} />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })
})