import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData } from "@/lib/sheets"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"

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

async function findNextEmptyRow(accessToken, sheetName, spreadsheetId) {
  const colA = await getSheetData(accessToken, `${sheetName}!A1:A9998`, spreadsheetId)
  // Scan from top to bottom, track last non-empty row
  let lastNonEmpty = 0
  for (let i = 0; i < colA.length; i++) {
    const cell = colA[i] && colA[i][0]
    if (cell && String(cell).trim().length > 0) {
      lastNonEmpty = i
    }
  }
  return lastNonEmpty + 2 // +1 for 1-indexed, +1 for next row
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = AVAILABLE_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function getMonthName(dateStr) {
  return AVAILABLE_MONTHS[new Date(dateStr).getMonth()]
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    const { type, tanggal, keterangan, kategori, jumlah, akunBank, catatan, eventId, eventSubKategori } = body

    if (!tanggal || !kategori || !jumlah) {
      return Response.json({ error: "Tanggal, kategori, dan jumlah wajib diisi" }, { status: 400 })
    }

    const amount = parseFloat(String(jumlah).replace(/[^0-9.]/g, ""))
    if (isNaN(amount) || amount <= 0 || amount > 999999999999) {
      return Response.json({ error: "Jumlah harus antara 1 dan 999.999.999.999" }, { status: 400 })
    }
    if (keterangan && keterangan.length > 500) {
      return Response.json({ error: "Keterangan maksimal 500 karakter" }, { status: 400 })
    }
    if (kategori && kategori.length > 100) {
      return Response.json({ error: "Kategori maksimal 100 karakter" }, { status: 400 })
    }
    if (catatan && catatan.length > 1000) {
      return Response.json({ error: "Catatan maksimal 1000 karakter" }, { status: 400 })
    }
    if (akunBank && akunBank.length > 100) {
      return Response.json({ error: "Akun bank maksimal 100 karakter" }, { status: 400 })
    }
    const ALLOWED_TYPES = ["income", "expense", "savings"]
    if (type && !ALLOWED_TYPES.includes(type)) {
      return Response.json({ error: "Tipe transaksi tidak valid" }, { status: 400 })
    }

    const formattedDate = formatDate(tanggal)
    const month = getMonthName(tanggal)
    const year = new Date(tanggal).getFullYear()
    const sheetName = type === "income" ? "Pemasukan" : type === "savings" ? "Tabungan" : "Pengeluaran"

    const row = [
      formattedDate,
      "",
      keterangan || "",
      kategori,
      amount,
      "",
      "",
      akunBank || "",
      amount,
      catatan || "",
      month,
      year,
      year,
      eventId || "",
      eventSubKategori || "",
    ]

    const targetRow = await findNextEmptyRow(accessToken, sheetName, spreadsheetId)
    await sheetsUpdate(accessToken, `${sheetName}!A${targetRow}:O${targetRow}`, [row], spreadsheetId)

    return Response.json({ success: true, message: `Transaksi berhasil disimpan ke tab ${sheetName}`, rowIndex: targetRow })
  } catch (err) {
    console.error("[Transaction]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
