import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { appendSheetValues, getSheetData, parseRupiah } from "@/lib/sheets"
import { runRecordCreations } from "@/lib/recordQuota"
import { budgetCompositeKey, validateBudgetCopyBody } from "@/lib/budgetCopy"

export const dynamic = "force-dynamic"

const SHEET_NAME = "Budgets"
const RANGE = `${SHEET_NAME}!A:F`

function rowToBudget(row, rowIndex) {
  return {
    rowIndex,
    kategori: String(row?.[0] || "").trim(),
    bulan: String(row?.[1] || "").trim(),
    tahun: String(row?.[2] || "").trim(),
    limit: parseRupiah(row?.[3] || 0),
    akun: String(row?.[4] || "").trim(),
    catatan: String(row?.[5] || "").trim(),
  }
}

function parseRows(rows) {
  return (rows || []).slice(1).map((row, index) => rowToBudget(row, index + 2)).filter(row => row.kategori && row.bulan && row.tahun)
}

function staleResponse(message = "Data anggaran berubah. Muat ulang lalu coba lagi.") {
  return Response.json({ error: message, code: "BUDGET_COPY_STALE", retryable: true }, { status: 409 })
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const blocked = featureUnavailableResponse(auth, "budgets", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const { errors, source, destination, items } = validateBudgetCopyBody(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; "), code: "BUDGET_COPY_INVALID" }, { status: 400 })
    }

    return runRecordCreations(auth, "budgets", {
      month: destination.bulan,
      year: destination.tahun,
    }, items.length, async quotaRows => {
      const rows = quotaRows ? parseRows(quotaRows) : parseRows(await getSheetData(auth.accessToken, RANGE, auth.spreadsheetId))
      const sourceRows = new Map(rows.map(row => [row.rowIndex, row]))
      const destinationKeys = new Set(
        rows
          .filter(row => row.bulan === destination.bulan && row.tahun === destination.tahun)
          .map(row => budgetCompositeKey(row.kategori, row.bulan, row.tahun, row.akun)),
      )
      const requestedKeys = new Set()
      const values = []

      for (const item of items) {
        const sourceRow = sourceRows.get(item.rowIndex)
        if (!sourceRow || sourceRow.bulan !== source.bulan || sourceRow.tahun !== source.tahun) {
          return staleResponse()
        }
        if (
          sourceRow.kategori !== item.kategori ||
          sourceRow.akun !== item.akun ||
          !Number.isFinite(sourceRow.limit) ||
          sourceRow.limit <= 0
        ) {
          return staleResponse()
        }

        const targetKey = budgetCompositeKey(item.kategori, destination.bulan, destination.tahun, item.akun)
        if (destinationKeys.has(targetKey) || requestedKeys.has(targetKey)) {
          return Response.json({
            error: `Anggaran ${item.kategori} sudah ada di bulan tujuan.`,
            code: "BUDGET_COPY_DUPLICATE",
            kategori: item.kategori,
            akun: item.akun,
          }, { status: 409 })
        }
        requestedKeys.add(targetKey)
        values.push([item.kategori, destination.bulan, destination.tahun, item.limit, item.akun, ""])
      }

      await appendSheetValues(auth.accessToken, RANGE, values, auth.spreadsheetId, "USER_ENTERED")
      return Response.json({
        success: true,
        copied: values.length,
        destination,
      })
    })
  } catch (error) {
    console.error("[Budget Copy]", error)
    return Response.json({ error: "Terjadi kesalahan internal", code: "BUDGET_COPY_FAILED" }, { status: 500 })
  }
}
