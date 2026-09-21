import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { buildBillSummary } from "@/lib/bills"
import {
  isLegacySheetOwner,
  isSheetNotFoundError,
  sheetConnectionRequiredPayload,
  sheetReconnectRequiredPayload,
} from "@/lib/legacySheet"
import { getHistoryWindow } from "@/lib/tier"
import { selectStableInsights } from "@/lib/insights"
import { getCurrentWeekPeriod } from "@/lib/usage"
import { buildMovements, computeBalances, buildMonthlySeries } from "@/lib/balances"
import { readCheckpointSettings, resolveCheckpoint } from "@/lib/checkpoint"
import { ledgerColumnRange } from "@/lib/ledgerRows"
import { CATEGORIES_KEY, getLegacyCategories, parseStoredCategories } from "@/lib/categories"
import { savingsCategoryKinds } from "@/lib/savingsAllocation"

export const dynamic = 'force-dynamic'

// Wave 2: Google's API reports an expired/insufficient authorization in several
// shapes; classifying it lets the ownership card show specific recovery copy.
function isGoogleAuthError(err) {
  const raw = String(err?.message || err || "")
  return /((^|[^0-9])401([^0-9]|$))|UNAUTHENTICATED|invalid[ _-]?authentication[ _-]?credentials|REQUEST HAD INVALID AUTHENTICATION CREDENTIALS/i.test(raw)
}

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "transactions", request)
  if (blocked) return blocked
  if (auth.needsSheetConnection) {
    return Response.json(sheetConnectionRequiredPayload(), { status: 409 })
  }
  const { accessToken, spreadsheetId } = auth
  const historyWindow = getHistoryWindow(auth.tier || "free")
  const fromMonth = historyWindow.from?.slice(0, 7)
  const toMonth = historyWindow.to?.slice(0, 7)
  const isVisibleMonth = (month, year) => {
    if (!fromMonth || !toMonth) return true
    const key = `${year}-${String({
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6,
      Jul: 7, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12,
    }[month] || 0).padStart(2, "0")}`
    return key >= fromMonth && key <= toMonth
  }
  let hasOlderData = false

  try {
    // The extended ranges carry the checkpoint/allocation metadata the canonical
    // model needs; the leading A–O/P columns are unchanged.
    const incomeRows = await getSheetData(accessToken, ledgerColumnRange("Pemasukan"), spreadsheetId)
    const expenseRows = await getSheetData(accessToken, ledgerColumnRange("Pengeluaran"), spreadsheetId)
    const savingsRows = await getSheetData(accessToken, ledgerColumnRange("Tabungan"), spreadsheetId).catch(() => [])
    const debtRows = await getSheetData(accessToken, ledgerColumnRange("Utang"), spreadsheetId).catch(() => [])

    let startingBalance = 0
    let startingBalanceDate = ""
    let checkpointState = readCheckpointSettings([])
    let categoryKinds = savingsCategoryKinds(getLegacyCategories())
    try {
      const settingsRows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId)
      checkpointState = readCheckpointSettings(settingsRows)
      for (const row of settingsRows) {
        const key = String(row?.[0] || "").trim().toLowerCase()
        if (key === "startingbalance") {
          startingBalance = parseRupiah(row[1] || 0)
        } else if (key === "startingbalancedate") {
          startingBalanceDate = String(row[1] || "").trim()
        } else if (key === CATEGORIES_KEY.toLowerCase()) {
          const parsed = parseStoredCategories(row[1])
          if (parsed) categoryKinds = savingsCategoryKinds(parsed)
        }
      }
    } catch (err) {
      // Settings tab may not exist yet
    }

    // One classification pass feeds every aggregate, so the display totals and
    // the canonical balances can never disagree about a row's movement kind.
    const movements = buildMovements({ incomeRows, expenseRows, savingsRows, categoryKinds })
    const series = buildMonthlySeries(movements)

    const transactions = []
    const monthlyIncome = {}
    const monthlyExpense = {}
    const monthlySavings = {}
    const categoryMap = new Map()

    for (const movement of movements) {
      if (!movement.month || !movement.monthKey) continue
      if (!isVisibleMonth(movement.month, movement.year)) {
        hasOlderData = true
        continue
      }
      const key = `${movement.month} ${movement.year}`

      transactions.push({
        id: movement.id,
        rowIndex: movement.rowIndex,
        date: movement.date,
        desc: movement.desc,
        category: movement.category,
        amount: movement.amount,
        type: movement.type,
        ...(movement.type === "expense" ? { expenseClass: movement.expenseClass } : {}),
        ...(movement.type === "savings"
          ? {
            goalId: movement.goalId,
            allocationStatus: movement.allocationStatus,
            allocationRemaining: movement.allocationRemaining,
          }
          : {}),
        month: movement.month,
        year: movement.year,
        account: movement.account,
        eventId: movement.eventId,
        eventSubKategori: movement.eventSubKategori,
      })

      if (movement.type === "savings") {
        monthlySavings[key] = (monthlySavings[key] || 0) + movement.amount
        continue
      }
      // Loan principal moves real cash, so it counts as Uang masuk / Uang keluar
      // while staying out of the routine and special spending buckets.
      if (movement.cashFlow) {
        if (movement.cashDelta > 0) monthlyIncome[key] = (monthlyIncome[key] || 0) + movement.amount
        else if (movement.cashDelta < 0) monthlyExpense[key] = (monthlyExpense[key] || 0) + movement.amount
      }
      if (movement.operational && movement.type === "expense") {
        categoryMap.set(movement.category, (categoryMap.get(movement.category) || 0) + movement.amount)
      }
    }

    const totalIncome = Object.values(monthlyIncome).reduce((s, v) => s + v, 0)
    const totalExpense = Object.values(monthlyExpense).reduce((s, v) => s + v, 0)
    const totalSavings = Object.values(monthlySavings).reduce((s, v) => s + v, 0)
    const totalSurplus = totalIncome - totalExpense
    const profitMargin = totalIncome > 0 ? ((totalSurplus / totalIncome) * 100).toFixed(1) : 0

    // Browser-facing series and categories honour the tier history window; the
    // canonical balances above deliberately do not.
    const monthlyData = series.monthly.filter(row => isVisibleMonth(row.month, row.year))
    const routineMonthlyData = series.routineMonthly.filter(row => isVisibleMonth(row.month, row.year))
    const categories = [...categoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)

    let billsSummary = { upcoming: [], overdue: [], totalUpcoming: 0, totalOverdue: 0, overdueCount: 0 }
    try {
      const billsRows = await getSheetData(accessToken, "Tagihan!A:M", spreadsheetId)
      billsSummary = buildBillSummary(billsRows, { limitUpcoming: 5 })
    } catch {
      // Tagihan tab doesn't exist yet
    }

    // The canonical money model. It reads the unfiltered rows on purpose: tier
    // history filtering limits what a Free user browses, not what they own.
    const balances = computeBalances({
      startingBalance,
      startingBalanceDate,
      startingBalanceConfirmed: checkpointState.startingBalanceConfirmed,
      movements,
      debtRows,
      categoryKinds,
      checkpoint: resolveCheckpoint(checkpointState),
      billsSummary,
    })

    transactions.reverse()
    const insightWeek = getCurrentWeekPeriod()
    const insights = selectStableInsights({ transactions, weekPeriod: insightWeek, limit: 3 })

    return Response.json({
      tier: auth.tier || "free",
      totalIncome,
      totalExpense,
      totalSurplus,
      totalSavings,
      profitMargin,
      monthlyData,
      routineMonthlyData,
      categories,
      transactions,
      netWorth: balances.netWorth,
      netWorthMonthlyDelta: balances.netWorthMonthlyDelta,
      netWorthHistory: balances.netWorthHistory,
      startingBalance,
      balances,
      billsSummary,
      history: {
        ...historyWindow,
        limited: historyWindow.months !== null,
        hasOlderData,
      },
      insights,
      insightWeek,
      serverTimestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[Dashboard]", err)
    if (isLegacySheetOwner(auth.user?.email) && isSheetNotFoundError(err)) {
      return Response.json(sheetReconnectRequiredPayload(), { status: 409 })
    }
    if (isGoogleAuthError(err)) {
      return Response.json(
        { code: "GOOGLE_AUTH_REQUIRED", error: "Sesi Google berakhir. Masuk ulang ke Artami untuk memperbarui izin." },
        { status: 401 }
      )
    }
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
