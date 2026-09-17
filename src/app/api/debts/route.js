import { getAuthContext } from "@/lib/apiAuth"
import { featureUnavailableResponse } from "@/lib/featureGuard"
import { ensureExpenseClassHeader, findNextEmptyRow, getSheetData, parseRupiah } from "@/lib/sheets"
import { quotaErrorResponse } from "@/lib/transactionQuota"
import { runRecordCreation } from "@/lib/recordQuota"
import { OPERATION_KINDS } from "@/lib/financialOperations"
import { buildLedgerRow, ledgerRange, wibToday } from "@/lib/ledgerRows"
import { resolveCheckpoint, readCheckpointSettings } from "@/lib/checkpoint"
import { MOVEMENT_KINDS } from "@/lib/movement"
import {
  FinancialWriteError,
  financialWriteErrorResponse,
  isValidOperationId,
  operationIdError,
  runFinancialWrite,
} from "@/lib/financialWrites"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Utang"
const RANGE = `${SHEET_NAME}!A:M`
const ENTRY_MODES = ["new", "historical"]

export const DEBT_ENTRY_MODES = { new: "new", historical: "historical" }

function rowToDebt(row, rowIndex) {
  return {
    rowIndex,
    id: String(row[0] || "").trim(),
    namaOrang: String(row[1] || "").trim(),
    jumlah: parseRupiah(row[2] || 0),
    arah: String(row[3] || "utang").trim().toLowerCase(),
    jatuhTempo: String(row[4] || "").trim(),
    status: String(row[5] || "open").trim().toLowerCase(),
    sisaSaldo: parseRupiah(row[6] || 0),
    catatan: String(row[7] || "").trim(),
    createdAt: String(row[8] || "").trim(),
    // Blank means a legacy row recorded before entry modes existed; those rows
    // never generated a cash movement, which is exactly the historical mode.
    entryMode: String(row[9] || "").trim().toLowerCase() || DEBT_ENTRY_MODES.historical,
    akunBank: String(row[10] || "").trim(),
    recordedAt: String(row[11] || "").trim(),
    operationId: String(row[12] || "").trim(),
  }
}

export function buildDebtRow({
  id,
  namaOrang,
  jumlah,
  arah,
  jatuhTempo,
  status,
  sisaSaldo,
  catatan,
  createdAt,
  entryMode,
  akunBank,
  recordedAt,
  operationId,
}) {
  return [
    id,
    namaOrang,
    jumlah,
    arah,
    jatuhTempo,
    status,
    sisaSaldo,
    catatan || "",
    createdAt,
    entryMode || DEBT_ENTRY_MODES.historical,
    akunBank || "",
    recordedAt || "",
    operationId || "",
  ]
}

function validateDebt(body) {
  const errors = []
  if (!body.namaOrang) errors.push("namaOrang required")
  if (!body.jumlah || isNaN(parseFloat(body.jumlah))) errors.push("jumlah must be a number")
  if (!body.arah || !["utang", "piutang"].includes(body.arah)) errors.push("arah must be 'utang' or 'piutang'")
  if (!body.jatuhTempo) errors.push("jatuhTempo required")
  return errors
}

async function fetchAllDebts(accessToken, spreadsheetId) {
  const rows = await getSheetData(accessToken, RANGE, spreadsheetId)
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToDebt(r, i + 1))
  }
  return out
}

async function sheetsUpdate(accessToken, range, values, spreadsheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }
  return res.json()
}

async function readActiveCheckpoint(accessToken, spreadsheetId) {
  try {
    const rows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId)
    return resolveCheckpoint(readCheckpointSettings(rows))
  } catch {
    return resolveCheckpoint({})
  }
}

export async function GET(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "debts", request)
  if (blocked) return blocked
  const { accessToken, spreadsheetId } = auth

  try {
    const debts = await fetchAllDebts(accessToken, spreadsheetId)
    return Response.json({ debts })
  } catch (err) {
    console.error("[Debts]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "debts", request)
  if (blocked) return blocked

  try {
    const body = await request.json()
    const operationId = String(body?.operationId || "").trim()
    if (!isValidOperationId(operationId)) return financialWriteErrorResponse(operationIdError(operationId))

    if (body.action === "pay") {
      return await handlePayment(auth, body, operationId)
    }

    const errors = validateDebt(body)
    if (errors.length) {
      return Response.json({ error: errors.join("; ") }, { status: 400 })
    }

    const entryMode = body.entryMode === undefined || String(body.entryMode).trim() === ""
      ? DEBT_ENTRY_MODES.historical
      : String(body.entryMode).trim().toLowerCase()
    if (!ENTRY_MODES.includes(entryMode)) {
      return Response.json({ error: "entryMode must be 'new' or 'historical'" }, { status: 400 })
    }
    if (entryMode === DEBT_ENTRY_MODES.new && !String(body.akunBank || "").trim()) {
      return Response.json({ error: "Transaksi baru membutuhkan akun yang terpengaruh" }, { status: 400 })
    }

    return runRecordCreation(auth, "debts", {}, async () => {
      const id = String(Date.now())
      const createdAt = new Date().toISOString().split("T")[0]
      const jumlah = parseFloat(body.jumlah)
      const arah = String(body.arah).trim().toLowerCase()
      const isNewMovement = entryMode === DEBT_ENTRY_MODES.new
      const today = wibToday()

      const result = await runFinancialWrite({
        auth,
        operationId,
        kind: OPERATION_KINDS.debtCreate,
        // A new-mode debt writes one ledger row; a historical entry writes none.
        quotaUnits: isNewMovement ? 1 : 0,
        prepare: async ({ accessToken, spreadsheetId }) => {
          const debtRowIndex = await findNextEmptyRow(accessToken, SHEET_NAME, spreadsheetId)
          const debtRow = buildDebtRow({
            id,
            namaOrang: String(body.namaOrang).trim(),
            jumlah,
            arah,
            jatuhTempo: String(body.jatuhTempo).trim(),
            status: "open",
            sisaSaldo: jumlah,
            catatan: body.catatan || "",
            createdAt,
            entryMode,
            akunBank: isNewMovement ? String(body.akunBank).trim() : "",
            recordedAt: isNewMovement ? new Date().toISOString() : "",
            operationId,
          })

          const data = [{ range: `${SHEET_NAME}!A${debtRowIndex}:M${debtRowIndex}`, values: [debtRow] }]

          if (isNewMovement) {
            // The principal moves now: a received Utang is cash in, an issued
            // Piutang is cash out, so the two sides offset in Kekayaan Bersih.
            const targetSheet = arah === "piutang" ? "Pengeluaran" : "Pemasukan"
            if (targetSheet === "Pengeluaran") await ensureExpenseClassHeader(accessToken, spreadsheetId)
            const checkpoint = await readActiveCheckpoint(accessToken, spreadsheetId)
            const txRowIndex = await findNextEmptyRow(accessToken, targetSheet, spreadsheetId)
            const txRow = buildLedgerRow({
              tab: targetSheet,
              tanggal: today.tanggal,
              id: `debtprincipal:${id}`,
              keterangan: arah === "piutang" ? `Piutang ke ${body.namaOrang}` : `Utang dari ${body.namaOrang}`,
              kategori: arah === "piutang" ? "Piutang" : "Utang",
              amount: jumlah,
              akunBank: String(body.akunBank).trim(),
              catatan: body.catatan || "",
              sifat: "Rutin",
              movementKind: arah === "piutang" ? MOVEMENT_KINDS.receivablePrincipalOut : MOVEMENT_KINDS.debtPrincipalIn,
              checkpointId: checkpoint.checkpointId,
              relatedRecordId: `Utang!A${debtRowIndex}`,
              recordedAt: new Date().toISOString(),
            })
            data.push({ range: ledgerRange(targetSheet, txRowIndex), values: [txRow] })
          }

          return {
            data,
            relatedId: `${SHEET_NAME}!A${debtRowIndex}`,
            response: { id, entryMode, message: "Debt created" },
          }
        },
      })

      return Response.json(result.response)
    })
  } catch (err) {
    const mapped = financialWriteErrorResponse(err)
    if (mapped) return mapped
    if (err?.code === "FEATURE_LIMIT_REACHED" || err?.code === "ENTITLEMENT_UNAVAILABLE") {
      return quotaErrorResponse(err)
    }
    console.error("[Debts]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

/**
 * Cheap read-only pre-check so a repeat submit never reserves quota. The
 * authoritative check still runs inside the serialized write.
 */
async function findRecordedPayment(accessToken, spreadsheetId, debtId, paymentId) {
  try {
    const all = await fetchAllDebts(accessToken, spreadsheetId)
    const existing = all.find(debt => debt.id === String(debtId))
    if (!existing) return null
    const txSheet = existing.arah === "piutang" ? "Pemasukan" : "Pengeluaran"
    const txId = `debtpay:${existing.id}:${paymentId}`
    const txIds = await getSheetData(accessToken, `${txSheet}!B:B`, spreadsheetId)
    const alreadyRecorded = txIds.some((row, index) => index > 0 && String(row?.[0] || "").trim() === txId)
    if (!alreadyRecorded) return null
    return {
      success: true,
      idempotent: true,
      message: "Pembayaran ini sudah tercatat",
    }
  } catch {
    return null
  }
}

async function handlePayment(auth, body, operationId) {
  if (!body.id || !body.paymentId || !/^[a-zA-Z0-9-]{1,100}$/.test(body.paymentId) || !body.amount || body.amount <= 0) {
    return Response.json({ error: "id, paymentId, and positive amount required for payment" }, { status: 400 })
  }

  const akunBank = String(body.akunBank || "").trim()

  const recorded = await findRecordedPayment(auth.accessToken, auth.spreadsheetId, body.id, body.paymentId)
  if (recorded) {
    return Response.json({ ...recorded, paymentAmount: Number(body.amount) })
  }

  try {
    const result = await runFinancialWrite({
      auth,
      operationId,
      kind: OPERATION_KINDS.debtPayment,
      quotaUnits: 1,
      prepare: async ({ accessToken, spreadsheetId }) => {
        const all = await fetchAllDebts(accessToken, spreadsheetId)
        const existing = all.find(debt => debt.id === String(body.id))
        if (!existing) {
          throw new FinancialWriteError("DEBT_NOT_FOUND", "Utang/piutang tidak ditemukan", { status: 404 })
        }

        const txId = `debtpay:${existing.id}:${body.paymentId}`
        const txSheet = existing.arah === "piutang" ? "Pemasukan" : "Pengeluaran"
        const txIds = await getSheetData(accessToken, `${txSheet}!B:B`, spreadsheetId)
        if (txIds.some((row, index) => index > 0 && String(row?.[0] || "").trim() === txId)) {
          return {
            shortCircuit: true,
            response: {
              success: true,
              idempotent: true,
              paymentAmount: Number(body.amount),
              newSisa: existing.sisaSaldo,
              newStatus: existing.status,
              message: "Pembayaran ini sudah tercatat",
            },
          }
        }

        if (existing.status === "settled") {
          throw new FinancialWriteError("DEBT_SETTLED", "Utang/piutang ini sudah lunas", { status: 400 })
        }

        const paymentAmount = Math.min(parseFloat(body.amount), existing.sisaSaldo)
        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
          throw new FinancialWriteError("INVALID_PAYMENT", "Jumlah pembayaran tidak valid", { status: 400 })
        }
        const newSisa = existing.sisaSaldo - paymentAmount
        const newStatus = newSisa <= 0 ? "settled" : "open"
        const today = wibToday()
        const isPiutang = existing.arah === "piutang"
        const description = isPiutang
          ? `Terima dari ${existing.namaOrang}`
          : `Bayar ke ${existing.namaOrang}`

        if (txSheet === "Pengeluaran") await ensureExpenseClassHeader(accessToken, spreadsheetId)
        const checkpoint = await readActiveCheckpoint(accessToken, spreadsheetId)
        const txRowIndex = await findNextEmptyRow(accessToken, txSheet, spreadsheetId)

        const txRow = buildLedgerRow({
          tab: txSheet,
          tanggal: today.tanggal,
          id: txId,
          keterangan: description,
          kategori: isPiutang ? "Piutang" : "Utang",
          amount: paymentAmount,
          akunBank,
          catatan: `Auto: ${existing.arah} ${existing.namaOrang}`,
          sifat: "Rutin",
          movementKind: isPiutang ? MOVEMENT_KINDS.receivablePrincipalIn : MOVEMENT_KINDS.debtPrincipalOut,
          checkpointId: checkpoint.checkpointId,
          relatedRecordId: `${SHEET_NAME}!A${existing.rowIndex}`,
          recordedAt: new Date().toISOString(),
        })

        const debtRow = buildDebtRow({
          id: existing.id,
          namaOrang: existing.namaOrang,
          jumlah: existing.jumlah,
          arah: existing.arah,
          jatuhTempo: existing.jatuhTempo,
          status: newStatus,
          sisaSaldo: Math.max(0, newSisa),
          catatan: existing.catatan,
          createdAt: existing.createdAt,
          entryMode: existing.entryMode,
          akunBank: akunBank || existing.akunBank,
          recordedAt: new Date().toISOString(),
          operationId,
        })

        return {
          data: [
            { range: `${SHEET_NAME}!A${existing.rowIndex}:M${existing.rowIndex}`, values: [debtRow] },
            { range: ledgerRange(txSheet, txRowIndex), values: [txRow] },
          ],
          relatedId: `${txSheet}!A${txRowIndex}`,
          response: {
            paymentAmount,
            newSisa: Math.max(0, newSisa),
            newStatus,
            message: newStatus === "settled" ? "Debt fully settled!" : `Payment of ${paymentAmount} recorded`,
          },
        }
      },
    })

    return Response.json(result.response)
  } catch (err) {
    const mapped = financialWriteErrorResponse(err)
    if (mapped) return mapped
    if (err?.code === "FEATURE_LIMIT_REACHED" || err?.code === "ENTITLEMENT_UNAVAILABLE") {
      return quotaErrorResponse(err)
    }
    console.error("[Debts]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function PUT(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "debts", request)
  if (blocked) return blocked
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 })
    }

    const all = await fetchAllDebts(accessToken, spreadsheetId)
    const existing = all.find(d => d.id === String(body.id))
    if (!existing) {
      return Response.json({ error: "Debt not found" }, { status: 404 })
    }

    const row = [
      existing.id,
      body.namaOrang || existing.namaOrang,
      parseFloat(body.jumlah) || existing.jumlah,
      body.arah || existing.arah,
      body.jatuhTempo || existing.jatuhTempo,
      body.status || existing.status,
      body.sisaSaldo !== undefined ? parseFloat(body.sisaSaldo) : existing.sisaSaldo,
      body.catatan !== undefined ? body.catatan : existing.catatan,
      existing.createdAt,
    ]
    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:I${existing.rowIndex}`, [row], spreadsheetId)
    return Response.json({ success: true, message: "Debt updated" })
  } catch (err) {
    console.error("[Debts]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function DELETE(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const blocked = featureUnavailableResponse(auth, "debts", request)
  if (blocked) return blocked
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    if (!body.id) {
      return Response.json({ error: "id required" }, { status: 400 })
    }

    const all = await fetchAllDebts(accessToken, spreadsheetId)
    const existing = all.find(d => d.id === String(body.id))
    if (!existing) {
      return Response.json({ error: "Debt not found" }, { status: 404 })
    }

    await sheetsUpdate(accessToken, `${SHEET_NAME}!A${existing.rowIndex}:M${existing.rowIndex}`, [Array(13).fill("")], spreadsheetId)
    return Response.json({ success: true, message: "Debt deleted" })
  } catch (err) {
    console.error("[Debts]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
