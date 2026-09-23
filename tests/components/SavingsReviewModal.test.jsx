import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SavingsReviewModal from "@/components/SavingsReviewModal"

const submitFinancialWrite = vi.fn()
const verifyFinancialOperation = vi.fn()

vi.mock("@/lib/financialWriteClient", () => ({
  submitFinancialWrite: (...args) => submitFinancialWrite(...args),
  verifyFinancialOperation: (...args) => verifyFinancialOperation(...args),
  WRITE_MESSAGES: {
    unresolved: "Status belum dapat dipastikan",
    unresolvedHint: "Periksa lagi sebelum menyimpan perubahan lain.",
    retryable: "Penyimpanan lain sedang diproses. Coba lagi sebentar.",
    offline: "Tidak ada koneksi internet.",
    schemaConflict: "Struktur Google Sheets perlu ditinjau agar data baru dapat disimpan.",
    stale: "Data belum tersinkron. Muat ulang dulu sebelum menyimpan.",
    alreadyCommitted: "Perubahan ini memang sudah tersimpan.",
  },
}))

vi.mock("@/lib/financialWriteState", () => ({
  reportWriteOutcome: vi.fn(),
  useFinancialWriteGuard: () => ({ blocked: false, message: "", unresolvedOperationId: null }),
}))

vi.mock("@/app/dashboard/_components/Sheet", () => ({
  default: ({ children }) => <div>{children}</div>,
}))

function mockFetch(responses) {
  const fetchMock = vi.fn(url => {
    if (String(url).includes("/api/savings/allocations")) return Promise.resolve(responses.allocations())
    if (String(url).includes("/api/goals")) return Promise.resolve(responses.goals())
    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
  global.fetch = fetchMock
  return fetchMock
}

const ALLOCATIONS_PAYLOAD = () => ({
  ok: true,
  json: async () => ({
    success: true,
    allocations: [
      { rowIndex: 2, fingerprint: "sv:2:a", desc: "Tabungan lama BCA", category: "Tabungan Cash", savingsKind: "liquid", remaining: 1000000, goalId: "", status: "reserved" },
      { rowIndex: 3, fingerprint: "sv:3:b", desc: "Tabungan lama DANA", category: "Tabungan Cash", savingsKind: "liquid", remaining: 500000, goalId: "", status: "reserved" },
      { rowIndex: 4, fingerprint: "sv:4:c", desc: "Sudah dialokasikan", category: "Dana Darurat", savingsKind: "liquid", remaining: 200000, goalId: "goal-1", status: "allocated" },
      { rowIndex: 5, fingerprint: "sv:5:d", desc: "Sudah dibebaskan", category: "Tabungan Cash", savingsKind: "liquid", remaining: 0, goalId: "", status: "released" },
    ],
    summary: { unassignedTotal: 1500000, needsReviewCount: 0, needsReviewTotal: 0 },
  }),
})

const GOALS_PAYLOAD = () => ({
  ok: true,
  json: async () => ({
    success: true,
    goals: [
      { id: "goal-1", nama: "Dana Darurat", status: "active" },
      { id: "goal-2", nama: "Liburan", status: "settled" },
    ],
  }),
})

beforeEach(() => {
  vi.clearAllMocks()
  submitFinancialWrite.mockResolvedValue({ ok: true, outcome: "ok", operationId: "op-1", data: { message: "1 tabungan dialokasikan ke target" } })
  verifyFinancialOperation.mockResolvedValue({ resolved: false, committed: null, data: null })
})

describe("SavingsReviewModal", () => {
  it("lists only unassigned rows with nonzero remaining and shows the unassigned total", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    expect(screen.getByText("Tabungan lama DANA")).toBeInTheDocument()
    expect(screen.queryByText("Sudah dialokasikan")).not.toBeInTheDocument()
    expect(screen.queryByText("Sudah dibebaskan")).not.toBeInTheDocument()
    expect(screen.getByText("Rp 1.500.000")).toBeInTheDocument()
  })

  it("sends assign with one fingerprint per selected row and refreshes after success", async () => {
    const fetchMock = mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    const onSaved = vi.fn()
    const onToast = vi.fn()
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={onSaved} onToast={onToast} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.change(screen.getByLabelText(/alokasikan ke target/i), { target: { value: "goal-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Alokasikan" }))
    fireEvent.click(await screen.findByRole("button", { name: "Ya, alokasikan" }))

    await waitFor(() => expect(submitFinancialWrite).toHaveBeenCalledTimes(1))
    expect(submitFinancialWrite).toHaveBeenCalledWith({
      url: "/api/savings/allocations",
      body: {
        action: "assign",
        goalId: "goal-1",
        selections: [{ rowIndex: 2, fingerprint: "sv:2:a" }],
      },
    })
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onToast.mock.calls.some(([message]) => message === "1 tabungan dialokasikan ke target")).toBe(true)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/savings/allocations")).length).toBeGreaterThanOrEqual(2)
  })

  it("requires a goal before assigning", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.click(screen.getByRole("button", { name: "Alokasikan" }))

    expect(await screen.findByText("Target tabungan wajib dipilih")).toBeInTheDocument()
    expect(submitFinancialWrite).not.toHaveBeenCalled()
  })

  it("sends release without a goalId and tells the user the money is free again", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    const onToast = vi.fn()
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={onToast} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama DANA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama dana/i }))
    fireEvent.click(screen.getByRole("button", { name: "Bebaskan" }))
    fireEvent.click(await screen.findByRole("button", { name: "Ya, bebaskan" }))

    await waitFor(() => expect(submitFinancialWrite).toHaveBeenCalledTimes(1))
    expect(submitFinancialWrite.mock.calls[0][0].body.action).toBe("release")
    expect(submitFinancialWrite.mock.calls[0][0].body.goalId).toBeUndefined()
  })

  it("reloads the list when the server reports a stale selection", async () => {
    const fetchMock = mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    submitFinancialWrite.mockResolvedValue({ ok: false, outcome: "failed", operationId: "op-2", code: "ALLOCATION_STALE", error: "Daftar tabungan berubah. Muat ulang lalu pilih kembali." })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.change(screen.getByLabelText(/alokasikan ke target/i), { target: { value: "goal-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Alokasikan" }))
    fireEvent.click(await screen.findByRole("button", { name: "Ya, alokasikan" }))

    await waitFor(() => expect(screen.getByText("Daftar tabungan berubah. Muat ulang lalu pilih kembali.")).toBeInTheDocument())
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/api/savings/allocations")).length).toBeGreaterThanOrEqual(2)
  })

  it("keeps the selection when the write fails for a non-stale reason", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    submitFinancialWrite.mockResolvedValue({ ok: false, outcome: "failed", operationId: "op-3", code: "OTHER", error: "Gagal menyimpan" })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.change(screen.getByLabelText(/alokasikan ke target/i), { target: { value: "goal-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Alokasikan" }))
    fireEvent.click(await screen.findByRole("button", { name: "Ya, alokasikan" }))

    expect(await screen.findByText("Gagal menyimpan")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /tabungan lama bca/i })).toHaveAttribute("aria-pressed", "true")
  })

  it("shows a confirmation with count and total before any grouped write", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.change(screen.getByLabelText(/alokasikan ke target/i), { target: { value: "goal-1" } })
    fireEvent.click(screen.getByRole("button", { name: "Alokasikan" }))

    const dialog = await screen.findByRole("alertdialog", { name: "Konfirmasi alokasi tabungan" })
    expect(dialog).toHaveTextContent("1 baris")
    expect(dialog).toHaveTextContent("Rp 1.000.000")
    expect(submitFinancialWrite).not.toHaveBeenCalled()
  })

  it("applies nothing when the confirmation is cancelled", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.click(screen.getByRole("button", { name: "Bebaskan" }))
    fireEvent.click(await screen.findByRole("button", { name: "Batal" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(submitFinancialWrite).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: /tabungan lama bca/i })).toHaveAttribute("aria-pressed", "true")
  })

  it("drops the pending confirmation when the selection changes", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.click(screen.getByRole("button", { name: "Bebaskan" }))
    await screen.findByRole("alertdialog", { name: "Konfirmasi pembebasan tabungan" })

    fireEvent.click(screen.getByRole("button", { name: /tabungan lama dana/i }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(submitFinancialWrite).not.toHaveBeenCalled()
  })

  it("does not open the assign confirmation while the goal is missing", async () => {
    mockFetch({ allocations: ALLOCATIONS_PAYLOAD, goals: GOALS_PAYLOAD })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText("Tabungan lama BCA")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: /tabungan lama bca/i }))
    fireEvent.click(screen.getByRole("button", { name: "Alokasikan" }))

    expect(await screen.findByText("Target tabungan wajib dipilih")).toBeInTheDocument()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("shows the empty state when nothing needs review", async () => {
    global.fetch = vi.fn(url => {
      if (String(url).includes("/api/savings/allocations")) {
        return Promise.resolve({ ok: true, json: async () => ({ success: true, allocations: [], summary: { unassignedTotal: 0, needsReviewCount: 0, needsReviewTotal: 0 } }) })
      }
      return Promise.resolve(GOALS_PAYLOAD())
    })
    render(<SavingsReviewModal open onClose={vi.fn()} onSaved={vi.fn()} onToast={vi.fn()} />)

    expect(await screen.findByText(/Semua tabunganmu sudah punya tempat/i)).toBeInTheDocument()
  })
})
