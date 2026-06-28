const TX_HEADERS = [["Tanggal", "ID", "Keterangan", "Kategori", "Jumlah", "Pajak", "Biaya", "AkunBank", "Net", "Catatan", "M", "Y", "Y2"]]

const ALL_TABS = [
  // Transaction tabs (A-M, 13 columns)
  { name: "Pemasukan", headers: TX_HEADERS, cols: 13 },
  { name: "Pengeluaran", headers: TX_HEADERS, cols: 13 },
  { name: "Tabungan", headers: TX_HEADERS, cols: 13 },
  // Budgets (A-F, 6 columns)
  { name: "Budgets", headers: [["Kategori", "Bulan", "Tahun", "Limit", "Akun", "Catatan"]], cols: 6 },
  // Goals (A-H, 8 columns)
  { name: "Goals", headers: [["ID", "Nama", "Target", "Deadline", "Kategori", "Icon", "Color", "CreatedAt"]], cols: 8 },
  // Debts (A-I, 9 columns)
  { name: "Utang", headers: [["ID", "NamaOrang", "Jumlah", "Arah", "JatuhTempo", "Status", "SisaSaldo", "Catatan", "CreatedAt"]], cols: 9 },
  // Events (A-K, 11 columns)
  { name: "Momental", headers: [["ID", "Nama", "Tipe", "TanggalMulai", "TanggalSelesai", "TotalBudget", "Mode", "Status", "DanaTHR", "Catatan", "CreatedAt"]], cols: 11 },
  // Event sub-budgets (A-F, 6 columns)
  { name: "EventBudgets", headers: [["EventID", "SubKategori", "Limit", "Icon", "Color", "Catatan"]], cols: 6 },
  // Bills (A-M, 13 columns)
  { name: "Tagihan", headers: [["ID", "Nama", "Jumlah", "Tipe", "KategoriBill", "KategoriTransaksi", "Frekuensi", "TanggalJatuhTempo", "AkunBank", "Aktif", "TerakhirDibayar", "Catatan", "CreatedAt"]], cols: 13 },
  // Settings (A-B, 2 columns)
  { name: "Settings", headers: [["Key", "Value"]], cols: 2 },
]

export async function createUserSheet(accessToken, userName) {
  const title = `Artami Finance - ${userName || "User"} - ${new Date().toISOString().split("T")[0]}`

  // 1. Create the spreadsheet with the first 3 transaction tabs
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: ALL_TABS.slice(0, 3).map(t => ({
        properties: {
          title: t.name,
          gridProperties: { rowCount: 1000, columnCount: t.cols },
        },
      })),
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Gagal membuat sheet: ${err}`)
  }

  const spreadsheet = await createRes.json()
  const spreadsheetId = spreadsheet.spreadsheetId

  // 2. Write headers to the initial 3 tabs
  for (let i = 0; i < 3; i++) {
    const tab = ALL_TABS[i]
    const lastCol = String.fromCharCode(64 + tab.cols) // A=65, so 13 cols → M
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab.name + "!A1:" + lastCol + "1")}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: tab.headers }),
      }
    )
  }

  // 3. Add remaining tabs via batchUpdate
  const extraTabs = ALL_TABS.slice(3)
  const addSheetsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: extraTabs.map(t => ({
          addSheet: {
            properties: {
              title: t.name,
              gridProperties: { rowCount: 1000, columnCount: t.cols },
            },
          },
        })),
      }),
    }
  )

  if (!addSheetsRes.ok) {
    console.error("[SheetManager] Gagal menambah tab:", await addSheetsRes.text())
  }

  // 4. Write headers for extra tabs
  for (const tab of extraTabs) {
    const lastCol = String.fromCharCode(64 + tab.cols)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tab.name + "!A1:" + lastCol + "1")}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: tab.headers }),
      }
    )
  }

  return spreadsheetId
}
