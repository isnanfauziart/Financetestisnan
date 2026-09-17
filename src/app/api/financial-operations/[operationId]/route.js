import { getAuthContext } from "@/lib/apiAuth"
import { lookupFinancialOperation, financialWriteErrorResponse } from "@/lib/financialWrites"

export const dynamic = "force-dynamic"

/**
 * Resolves an uncertain save. The receipt ledger lives in the user's own Sheet,
 * so this never reports another user's operation and never writes anything.
 */
export async function GET(request, { params }) {
  const auth = await getAuthContext(request)
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const operationId = String(params?.operationId || "").trim()

  try {
    const result = await lookupFinancialOperation(auth.accessToken, auth.spreadsheetId, operationId)
    return Response.json({
      success: true,
      operationId,
      status: result.status,
      resolved: result.resolved,
      committed: result.committed,
      committedAt: result.receipt?.committedAt || "",
      relatedId: result.receipt?.relatedId || "",
      kind: result.receipt?.kind || "",
      ...(result.resolved ? {} : { message: "Status belum dapat dipastikan" }),
    })
  } catch (error) {
    const mapped = financialWriteErrorResponse(error)
    if (mapped) return mapped
    console.error("[FinancialOperations]", error)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
