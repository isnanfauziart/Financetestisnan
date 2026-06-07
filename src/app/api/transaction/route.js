import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { getSheetData } from "@/lib/sheets"

const SPREADSHEET_ID = process.env.SPREADSHEET_ID

async function sheetsUpdate(accessToken, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
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

async function findNextEmptyRow(accessToken, sheetName) {
  const colA = await getSheetData(accessToken, `${sheetName}!A:A`)
  for (let i = colA.length - 1; i >= 1; i--) {
    if (colA[i] && String(colA[i][0] || "").trim() !== "") {
      return i + 2
    }
  }
  return 2
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function getMonthName(dateStr) {
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
  return months[new Date(dateStr).getMonth()]
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, tanggal, keterangan, kategori, jumlah, akunBank, catatan } = body

    if (!tanggal || !kategori || !jumlah) {
      return Response.json({ error: "Tanggal, kategori, dan jumlah wajib diisi" }, { status: 400 })
    }

    const formattedDate = formatDate(tanggal)
    const month = getMonthName(tanggal)
    const year = new Date(tanggal).getFullYear()
    const amount = parseFloat(String(jumlah).replace(/[^0-9.]/g, ""))
    const sheetName = type === "income" ? "Pemasukan" : type === "savings" ? "Tabungan" : "Pengeluaran"

    // Format: Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M | Y | Y2
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
    ]

    const targetRow = await findNextEmptyRow(session.accessToken, sheetName)
    await sheetsUpdate(session.accessToken, `${sheetName}!A${targetRow}:M${targetRow}`, [row])

    return Response.json({ success: true, message: `Transaksi berhasil disimpan ke tab ${sheetName}`, rowIndex: targetRow })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
