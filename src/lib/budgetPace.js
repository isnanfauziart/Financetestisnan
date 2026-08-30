import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"
import { daysInMonth, getWibDateParts, monthSerial } from "@/lib/wibCalendar"

function monthIndex(value) {
  const text = String(value || "").trim()
  if (text === "Ags") return 7
  return AVAILABLE_MONTHS.indexOf(text)
}

function targetMonth(budget) {
  const index = monthIndex(budget?.bulan || budget?.month)
  const year = Number(budget?.tahun || budget?.year)
  if (index < 0 || !Number.isInteger(year) || year < 1) return null
  return { year, monthIndex: index }
}

export function computeBudgetPace({ limit, spent, month, year, bulan, tahun, now = new Date() }) {
  const target = targetMonth({ bulan: month || bulan, tahun: year || tahun })
  const current = getWibDateParts(now)
  const numericLimit = Number(limit)
  const numericSpent = Math.max(0, Number(spent) || 0)
  if (!target || !current || !Number.isFinite(numericLimit) || numericLimit <= 0) return null

  const targetSerial = monthSerial(target.year, target.monthIndex)
  const currentSerial = monthSerial(current.year, current.monthIndex)
  const remaining = Math.max(0, numericLimit - numericSpent)
  const exceeded = Math.max(0, numericSpent - numericLimit)
  if (targetSerial !== currentSerial) {
    return {
      status: targetSerial < currentSerial ? "past" : "future",
      remaining,
      exceeded,
      remainingDays: null,
      dailyRoom: null,
      expectedSpent: null,
      paceStatus: null,
    }
  }

  const totalDays = daysInMonth(current.year, current.monthIndex)
  const remainingDays = totalDays - current.day + 1
  const expectedSpent = numericLimit * (current.day / totalDays)
  const paceStatus = numericSpent > expectedSpent * 1.1
    ? "faster"
    : numericSpent < expectedSpent * 0.9 ? "slower" : "steady"

  return {
    status: exceeded > 0 ? "over" : "active",
    remaining,
    exceeded,
    remainingDays,
    dailyRoom: exceeded > 0 ? 0 : Math.ceil(remaining / remainingDays),
    expectedSpent: Math.round(expectedSpent),
    paceStatus,
  }
}

export function matchesBudgetPeriod(transaction, budget) {
  const target = targetMonth(budget)
  if (!target) return false

  const transactionMonth = monthIndex(transaction?.month)
  const transactionYear = Number(transaction?.year)
  if (transactionMonth >= 0 && Number.isInteger(transactionYear)) {
    return monthSerial(transactionYear, transactionMonth) === monthSerial(target.year, target.monthIndex)
  }

  const transactionDate = getWibDateParts(transaction?.date)
  return transactionDate && monthSerial(transactionDate.year, transactionDate.monthIndex) === monthSerial(target.year, target.monthIndex)
}

export function summarizeUnpaidBudgetBills({ bills = [], budget, now = new Date() }) {
  const target = targetMonth(budget)
  if (!target || !getWibDateParts(now)) return []
  const targetSerial = monthSerial(target.year, target.monthIndex)

  return bills
    .filter(bill => {
      if (!bill || bill.tipe !== "expense" || bill.aktif === false || bill.isPaidForCurrentCycle) return false
      if (bill.kategoriTransaksi !== budget.kategori) return false
      if (budget.akun && bill.akunBank !== budget.akun) return false
      const dueDate = bill.currentCycleDueDate || bill.nextDueDate
      const due = getWibDateParts(dueDate)
      return due && monthSerial(due.year, due.monthIndex) === targetSerial
    })
    .map(bill => ({
      ...bill,
      budgetDueDate: bill.currentCycleDueDate || bill.nextDueDate,
    }))
    .sort((a, b) => String(a.budgetDueDate).localeCompare(String(b.budgetDueDate)) || String(a.id).localeCompare(String(b.id)))
}
