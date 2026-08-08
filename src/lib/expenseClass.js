export const EXPENSE_CLASS_ROUTINE = "routine"
export const EXPENSE_CLASS_SPECIAL = "special"

export function normalizeExpenseClass(value) {
  const normalized = String(value || "").trim().toLowerCase()
  return normalized === "spesial" || normalized === "special"
    ? EXPENSE_CLASS_SPECIAL
    : EXPENSE_CLASS_ROUTINE
}

export function expenseClassToSheet(value) {
  return normalizeExpenseClass(value) === EXPENSE_CLASS_SPECIAL ? "Spesial" : "Rutin"
}

export function isSpecialExpense(transaction) {
  return transaction?.type === "expense"
    && normalizeExpenseClass(transaction.expenseClass) === EXPENSE_CLASS_SPECIAL
}
