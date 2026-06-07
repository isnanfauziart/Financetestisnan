export function parseDateLoose(s) {
  if (!s) return 0
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Ags: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11 }
  const m = String(s).match(/^(\d+)\s+(\w+)\s+(\d+)/)
  if (m) return new Date(+m[3], months[m[2]] ?? 0, +m[1]).getTime()
  const t = Date.parse(s)
  return isNaN(t) ? 0 : t
}

export function computeGoalProgress(goal, transactions) {
  if (!goal) return 0
  const goalCreated = goal.createdAt ? new Date(goal.createdAt).getTime() : 0
  let sum = 0
  for (const t of transactions || []) {
    if (t.type !== "savings") continue
    if (t.category !== goal.kategori) continue
    if (!t.date) continue
    const txTime = parseDateLoose(t.date)
    if (txTime < goalCreated) continue
    sum += t.amount
  }
  return sum
}

export function computeAllGoalProgress(goals, transactions) {
  const map = {}
  for (const goal of goals || []) {
    map[goal.id] = computeGoalProgress(goal, transactions)
  }
  return map
}
