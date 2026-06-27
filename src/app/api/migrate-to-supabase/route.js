import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = 'force-dynamic'

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function parseDateLoose(dateStr) {
  if (!dateStr) return null
  const s = String(dateStr).trim()
  // Try "24 Jun 2026" format
  const parts = s.split(" ")
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const monthIdx = MONTHS.indexOf(parts[1])
    const year = parseInt(parts[2], 10)
    if (!isNaN(day) && monthIdx >= 0 && !isNaN(year)) {
      return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }
  // Try ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

function pickAmount(row, netIdx = 8, grossIdx = 4) {
  const net = row[netIdx]
  const gross = row[grossIdx]
  const isNumeric = (v) => v != null && /^-?[\d.,]+$/.test(String(v).trim())
  if (isNumeric(net)) {
    const n = parseRupiah(net)
    if (n > 0) return n
  }
  return parseRupiah(gross) || 0
}

async function migrateTransactions(accessToken, spreadsheetId, userId) {
  const tabs = [
    { name: "Pemasukan", tipe: "income" },
    { name: "Pengeluaran", tipe: "expense" },
    { name: "Tabungan", tipe: "savings" },
  ]

  let totalMigrated = 0

  const debugInfo = {}

  for (const tab of tabs) {
    const rows = await getSheetData(accessToken, `${tab.name}!A:O`, spreadsheetId).catch((err) => {
      console.error(`[Migrate] Error reading ${tab.name}:`, err.message)
      return []
    })
    const transactions = []

    // Debug: log first few rows
    debugInfo[tab.name] = {
      totalRows: rows.length,
      firstDataRow: rows[1] ? rows[1].slice(0, 15) : null,
      columnA: rows[1]?.[0],
      columnK: rows[1]?.[10],
      parsedDate: parseDateLoose(rows[1]?.[0]),
      parsedAmount: pickAmount(rows[1] || []),
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[0]) continue

      const tanggal = parseDateLoose(row[0])
      if (!tanggal) continue

      const keterangan = String(row[2] || "").trim()
      const kategori = String(row[3] || "Lainnya").trim()
      const jumlah = pickAmount(row)
      const pajak = parseRupiah(row[5] || 0)
      const biaya = parseRupiah(row[6] || 0)
      const akunBank = String(row[7] || "").trim()
      const net = parseRupiah(row[8] || 0) || jumlah
      const catatan = String(row[9] || "").trim()
      const bulan = String(row[10] || "").trim()
      const tahun = String(row[11] || new Date().getFullYear()).trim()
      const eventId = String(row[13] || "").trim() || null
      const eventSubKategori = String(row[14] || "").trim() || null

      if (jumlah <= 0) continue
      if (!bulan || !MONTHS.includes(bulan)) continue

      transactions.push({
        user_id: userId,
        tanggal,
        keterangan,
        kategori,
        jumlah,
        pajak,
        biaya,
        akun_bank: akunBank,
        net: net || jumlah,
        catatan,
        bulan,
        tahun,
        tipe: tab.tipe,
        event_id: eventId,
        event_sub_kategori: eventSubKategori,
        row_index: i + 1,
        source: "import",
      })
    }

    // Batch insert (Supabase handles up to 1000 rows per call)
    if (transactions.length > 0) {
      const batchSize = 500
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize)
        const { error } = await supabaseAdmin
          .from("transactions")
          .upsert(batch, { onConflict: "user_id,tanggal,kategori,jumlah,tipe", ignoreDuplicates: true })

        if (error) {
          console.error(`[Migrate] Error inserting ${tab.name} batch:`, error.message)
        } else {
          totalMigrated += batch.length
        }
      }
    }
  }

  return { totalMigrated, debugInfo }
}

async function migrateBudgets(accessToken, spreadsheetId, userId) {
  const rows = await getSheetData(accessToken, "Budgets!A:F", spreadsheetId).catch(() => [])
  const budgets = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0] || !row[1] || !row[2]) continue

    budgets.push({
      user_id: userId,
      kategori: String(row[0] || "").trim(),
      bulan: String(row[1] || "").trim(),
      tahun: String(row[2] || "").trim(),
      limit: parseRupiah(row[3] || 0),
      akun: String(row[4] || "").trim() || null,
      catatan: String(row[5] || "").trim(),
      row_index: i + 1,
      source: "import",
    })
  }

  if (budgets.length > 0) {
    const { error } = await supabaseAdmin
      .from("budgets")
      .upsert(budgets, { onConflict: "user_id,kategori,bulan,tahun,akun", ignoreDuplicates: true })

    if (error) console.error("[Migrate] Error inserting budgets:", error.message)
  }

  return budgets.length
}

async function migrateGoals(accessToken, spreadsheetId, userId) {
  const rows = await getSheetData(accessToken, "Goals!A:H", spreadsheetId).catch(() => [])
  const goals = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0] || !row[1]) continue

    const deadline = parseDateLoose(row[3])
    const createdAt = parseDateLoose(row[7])

    goals.push({
      id: String(row[0] || "").trim(),
      user_id: userId,
      nama: String(row[1] || "").trim(),
      target: parseRupiah(row[2] || 0),
      deadline: deadline || null,
      kategori: String(row[4] || "").trim(),
      icon: String(row[5] || "").trim(),
      color: String(row[6] || "").trim(),
      status: "open",
      row_index: i + 1,
      source: "import",
    })
  }

  if (goals.length > 0) {
    const { error } = await supabaseAdmin
      .from("goals")
      .upsert(goals, { onConflict: "id", ignoreDuplicates: true })

    if (error) console.error("[Migrate] Error inserting goals:", error.message)
  }

  return goals.length
}

async function migrateDebts(accessToken, spreadsheetId, userId) {
  const rows = await getSheetData(accessToken, "Utang!A:I", spreadsheetId).catch(() => [])
  const debts = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0] || !row[1]) continue

    const jatuhTempo = parseDateLoose(row[4])
    const createdAt = parseDateLoose(row[8])

    debts.push({
      id: String(row[0] || "").trim(),
      user_id: userId,
      nama_orang: String(row[1] || "").trim(),
      jumlah: parseRupiah(row[2] || 0),
      arah: String(row[3] || "utang").trim().toLowerCase(),
      jatuh_tempo: jatuhTempo || null,
      status: String(row[5] || "open").trim().toLowerCase(),
      sisa_saldo: parseRupiah(row[6] || 0),
      catatan: String(row[7] || "").trim(),
      row_index: i + 1,
      source: "import",
    })
  }

  if (debts.length > 0) {
    const { error } = await supabaseAdmin
      .from("debts")
      .upsert(debts, { onConflict: "id", ignoreDuplicates: true })

    if (error) console.error("[Migrate] Error inserting debts:", error.message)
  }

  return debts.length
}

async function migrateSettings(accessToken, spreadsheetId, userId) {
  const rows = await getSheetData(accessToken, "Settings!A:B", spreadsheetId).catch(() => [])
  const settings = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row[0]) continue

    settings.push({
      user_id: userId,
      key: String(row[0] || "").trim(),
      value: String(row[1] || "").trim(),
    })
  }

  if (settings.length > 0) {
    const { error } = await supabaseAdmin
      .from("user_settings")
      .upsert(settings, { onConflict: "user_id,key", ignoreDuplicates: true })

    if (error) console.error("[Migrate] Error inserting settings:", error.message)
  }

  return settings.length
}

export async function POST(request) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accessToken, spreadsheetId, user } = auth

  try {
    const results = {}

    // Migrate transactions (Pemasukan, Pengeluaran, Tabungan)
    const txResult = await migrateTransactions(accessToken, spreadsheetId, user.id)
    results.transactions = txResult.totalMigrated
    results.debug = txResult.debugInfo

    // Migrate budgets
    results.budgets = await migrateBudgets(accessToken, spreadsheetId, user.id)

    // Migrate goals
    results.goals = await migrateGoals(accessToken, spreadsheetId, user.id)

    // Migrate debts
    results.debts = await migrateDebts(accessToken, spreadsheetId, user.id)

    // Migrate settings
    results.settings = await migrateSettings(accessToken, spreadsheetId, user.id)

    // Update sync metadata
    const syncTabs = ["Pemasukan", "Pengeluaran", "Tabungan", "Budgets", "Goals", "Utang", "Settings"]
    for (const tab of syncTabs) {
      await supabaseAdmin
        .from("sync_metadata")
        .upsert({
          user_id: user.id,
          sheet_name: tab,
          last_synced_at: new Date().toISOString(),
          last_row_synced: 0,
        }, { onConflict: "user_id,sheet_name" })
    }

    return Response.json({
      success: true,
      results,
      message: `Migration berhasil! ${results.transactions} transaksi, ${results.budgets} budget, ${results.goals} goal, ${results.debts} debt, ${results.settings} setting.`,
    })
  } catch (err) {
    console.error("[Migrate to Supabase]", err)
    return Response.json({ error: "Terjadi kesalahan internal" }, { status: 500 })
  }
}
