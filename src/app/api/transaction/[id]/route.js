import { getAuthContext } from "@/lib/apiAuth"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"

const ALLOWED_TABS = ["Pemasukan", "Pengeluaran", "Tabungan"]

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = d.getDate()
  const month = AVAILABLE_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function getMonthName(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  return AVAILABLE_MONTHS[d.getMonth()]
}

export async function PUT(request, { params }) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    const { tab, type, tanggal, keterangan, kategori, jumlah, akunBank, rowIndex, eventId, eventSubKategori } = body

    if (!ALLOWED_TABS.includes(tab) || !rowIndex || !tanggal || !kategori || !jumlah) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const formattedDate = formatDate(tanggal)
    const month = getMonthName(tanggal)
    const year = new Date(tanggal).getFullYear()
    const amount = parseFloat(String(jumlah).replace(/[^0-9.]/g, ""))

    // Format: Tanggal | ID | Keterangan | Kategori | Jumlah | Pajak | Biaya | AkunBank | Net | Catatan | M | Y | Y2 | EventID | EventSubKategori
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
      "",
      month,
      year,
      year,
      eventId || "",
      eventSubKategori || "",
    ]

    // Update row at specific index: A{rowIndex}:O{rowIndex}
    const range = `${tab}!A${rowIndex}:O${rowIndex}`
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Sheets API error: ${err}`)
    }

    return Response.json({ success: true, message: "Transaksi diperbarui" })
  } catch (err) {
    console.error("[TransactionId]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { accessToken, spreadsheetId } = auth

  try {
    const body = await request.json()
    const { tab, rowIndex } = body

    if (!ALLOWED_TABS.includes(tab) || !rowIndex) {
      return Response.json({ error: "Missing tab or rowIndex" }, { status: 400 })
    }

    // Clear row contents: write 15 empty strings (A through O)
    const range = `${tab}!A${rowIndex}:O${rowIndex}`
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]] }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Sheets API error: ${err}`)
    }

    return Response.json({ success: true, message: "Transaksi dihapus" })
  } catch (err) {
    console.error("[TransactionId]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
