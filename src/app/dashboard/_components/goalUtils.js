import { MONTHS_MAP } from "./constants"
import { daysInMonth, getWibDateParts, monthSerial } from "@/lib/wibCalendar"

export function parseDateLoose(s) {
  if (!s) return 0
  const m = String(s).match(/^(\d+)\s+(\w+)\s+(\d+)/)
  if (m) return new Date(+m[3], MONTHS_MAP[m[2]] ?? 0, +m[1]).getTime()
  const t = Date.parse(s)
  return isNaN(t) ? 0 : t
}

export function parseGoalDeadline(deadline) {
  const match = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(String(deadline || "").trim())
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = match[2] ? Number(match[2]) - 1 : 11
  const day = match[3] ? Number(match[3]) : daysInMonth(year, monthIndex)
  if (!Number.isInteger(year) || year < 1 || monthIndex < 0 || monthIndex > 11) return null
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, monthIndex)) return null
  return { year, monthIndex, day }
}

function createdMonth(createdAt, fallback) {
  const parsed = getWibDateParts(createdAt)
  if (!parsed) return fallback
  return parsed
}

export function computeGoalPace(goal, progress, now = new Date()) {
  const target = Number(goal?.target)
  const deadline = parseGoalDeadline(goal?.deadline)
  const current = getWibDateParts(now)
  if (!Number.isFinite(target) || target <= 0 || !deadline || !current) return null

  const saved = Math.max(0, Number(progress) || 0)
  const remaining = Math.max(0, target - saved)
  const currentSerial = monthSerial(current.year, current.monthIndex)
  const deadlineSerial = monthSerial(deadline.year, deadline.monthIndex)
  if (remaining === 0) {
    return {
      status: "complete",
      remaining: 0,
      remainingMonths: 0,
      requiredMonthly: 0,
      observedMonthly: 0,
      additionalMonthly: 0,
    }
  }

  const remainingMonths = deadlineSerial >= currentSerial ? deadlineSerial - currentSerial + 1 : 0
  const requiredMonthly = remainingMonths > 0 ? Math.ceil(remaining / remainingMonths) : remaining
  if (remainingMonths === 0) {
    return {
      status: "expired",
      remaining,
      remainingMonths: 0,
      requiredMonthly,
      observedMonthly: 0,
      additionalMonthly: remaining,
    }
  }

  const created = createdMonth(goal?.createdAt, current)
  const elapsedMonths = Math.max(1, currentSerial - monthSerial(created.year, created.monthIndex) + 1)
  const observedMonthly = Math.floor(saved / elapsedMonths)
  const status = saved <= 0
    ? "no_contributions"
    : observedMonthly >= requiredMonthly ? "on_track" : "behind"

  return {
    status,
    remaining,
    remainingMonths,
    requiredMonthly,
    observedMonthly,
    additionalMonthly: Math.max(0, requiredMonthly - observedMonthly),
  }
}

/**
 * Goal progress is the remaining allocation a goal explicitly owns.
 *
 * A savings row contributes only through its `goalId`; blank metadata stays in
 * the unassigned review list instead of silently crediting whichever goal
 * happens to share the row's category. Progress is therefore a real reservation
 * of money the user owns, not a running total of matching deposits.
 */
export function computeGoalProgress(goal, allocations) {
  const goalId = typeof goal === "string" ? goal : String(goal?.id || "")
  if (!goalId) return 0
  const byGoal = allocations?.byGoal || null
  if (!byGoal) return 0
  const bucket = byGoal[goalId]
  if (!bucket) return 0
  return Math.max(0, Number(bucket.remaining) || 0)
}

export function computeAllGoalProgress(goals, allocations) {
  const map = {}
  for (const goal of goals || []) {
    map[goal.id] = computeGoalProgress(goal, allocations)
  }
  return map
}

/** Total the user reserved across every goal, straight from the allocation summary. */
export function totalAllocatedProgress(allocations) {
  return Math.max(0, Number(allocations?.liquidAssigned) || 0)
}
