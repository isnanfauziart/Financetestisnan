import { getToken } from "next-auth/jwt"
import { getSheetData, parseRupiah } from "@/lib/sheets"

export const dynamic = 'force-dynamic'

const SHEET_NAME = "Tagihan"
const RANGE = `${SHEET_NAME}!A:M`

function rowToBill(row, rowIndex) {
  return {
    rowIndex,
    id: String(row[0] || "").trim(),
    nama: String(row[1] || "").trim(),
    jumlah: parseRupiah(row[2] || 0),
    tipe: String(row[3] || "expense").trim().toLowerCase(),
    kategoriBill: String(row[4] || "").trim(),
    kategoriTransaksi: String(row[5] || "").trim(),
    frekuensi: String(row[6] || "monthly").trim().toLowerCase(),
    tanggalJatuhTempo: parseInt(row[7], 10) || 1,
    akunBank: String(row[8] || "").trim(),
    aktif: String(row[9] || "TRUE").trim().toUpperCase() === "TRUE",
    terakhirDibayar: String(row[10] || "").trim(),
    catatan: String(row[11] || "").trim(),
    createdAt: String(row[12] || "").trim(),
  }
}

async function fetchAllBills(accessToken) {
  const rows = await getSheetData(accessToken, RANGE).catch(() => [])
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[0] || !r[1]) continue
    out.push(rowToBill(r, i + 1))
  }
  return out
}

async function sheetsUpdate(accessToken, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
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

export async function PUT(request, { params }) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json()

    const all = await fetchAllBills(token.accessToken)
    const existing = all.find(b => b.id === id)
    if (!existing) {
      return Response.json({ error: "Tagihan tidak ditemukan" }, { status: 404 })
    }

    const row = [
      existing.id,
      body.nama !== undefined ? body.nama : existing.nama,
      body.jumlah !== undefined ? parseFloat(body.jumlah) : existing.jumlah,
      body.tipe !== undefined ? body.tipe : existing.tipe,
      body.kategoriBill !== undefined ? body.kategoriBill : existing.kategoriBill,
      body.kategoriTransaksi !== undefined ? body.kategoriTransaksi : existing.kategoriTransaksi,
      body.frekuensi !== undefined ? body.frekuensi : existing.frekuensi,
      body.tanggalJatuhTempo !== undefined ? parseInt(body.tanggalJatuhTempo, 10) : existing.tanggalJatuhTempo,
      body.akunBank !== undefined ? body.akunBank : existing.akunBank,
      body.aktif !== undefined ? (body.aktif ? "TRUE" : "FALSE") : (existing.aktif ? "TRUE" : "FALSE"),
      body.terakhirDibayar !== undefined ? body.terakhirDibayar : existing.terakhirDibayar,
      body.catatan !== undefined ? body.catatan : existing.catatan,
      existing.createdAt,
    ]
    await sheetsUpdate(token.accessToken, `${SHEET_NAME}!A${existing.rowIndex}:M${existing.rowIndex}`, [row])
    return Response.json({ success: true, message: "Tagihan diperbarui" })
  } catch (err) {
    console.error("[Bills PUT]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const token = await getToken({ req: request })
  if (!token?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const all = await fetchAllBills(token.accessToken)
    const existing = all.find(b => b.id === id)
    if (!existing) {
      return Response.json({ error: "Tagihan tidak ditemukan" }, { status: 404 })
    }

    await sheetsUpdate(token.accessToken, `${SHEET_NAME}!A${existing.rowIndex}:M${existing.rowIndex}`, [[""]])
    return Response.json({ success: true, message: "Tagihan dihapus" })
  } catch (err) {
    console.error("[Bills DELETE]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
