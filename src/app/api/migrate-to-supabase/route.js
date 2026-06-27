import { getAuthContext } from "@/lib/apiAuth"
import { getSheetData, parseRupiah } from "@/lib/sheets"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = 'force-dynamic'

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

// Map Indonesian month variants to short form
const MONTH_MAP = {
  "januari": "Jan", "februari": "Feb", "maret": "Mar", "april": "Apr",
  "mei": "Mei", "juni": "Jun", "juli": "Jul", "agustus": "Agu",
  "september": "Sep", "oktober": "Okt", "november": "Nov", "desember": "Des",
  "jan": "Jan", "feb": "Feb", "mar": "Mar", "apr": "Apr",
  "mei": "Mei", "jun": "Jun", "jul": "Jul", "agu": "Agu",
  "sep": "Sep", "okt": "Okt", "nov": "Nov", "des": "Des",
}

function normalizeMonth(s) {
  if (!s) return ""
  const lower = String(s).trim().toLowerCase()
  return MONTH_MAP[lower] || String(s).trim()
}

function parseDateLoose(dateStr) {
  if (!dateStr) return null
  const s = String(dateStr).trim()
  // Try "24 Jun 2026" format
  const parts = s.split(" ")
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const monthStr = normalizeMonth(parts[1])
    const monthIdx = MONTHS.indexOf(monthStr)
    let year = parseInt(parts[2], 10)
    // Handle 2-digit years
    if (year < 100) year += 2000
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

    // Debug counters
    let emptyRowCount = 0
    let invalidDateCount = 0
    let zeroAmountCount = 0
    let invalidMonthCount = 0
    let validCount = 0
    const sampleSkipped = { emptyRow: [], invalidDate: [], zeroAmount: [], invalidMonth: [] }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]

      // Check 1: Empty row or empty column A
      if (!row || !row[0]) {
        emptyRowCount++
        if (sampleSkipped.emptyRow.length < 3) sampleSkipped.emptyRow.push({ index: i, row: row?.slice(0, 15) })
        continue
      }

      const tanggal = parseDateLoose(row[0])

      // Check 2: Invalid date
      if (!tanggal) {
        invalidDateCount++
        if (sampleSkipped.invalidDate.length < 3) sampleSkipped.invalidDate.push({ index: i, columnA: row[0] })
        continue
      }

      const keterangan = String(row[2] || "").trim()
      const kategori = String(row[3] || "Lainnya").trim()
      const jumlah = pickAmount(row)
      const pajak = parseRupiah(row[5] || 0)
      const biaya = parseRupiah(row[6] || 0)
      const akunBank = String(row[7] || "").trim()
      const net = parseRupiah(row[8] || 0) || jumlah
      const catatan = String(row[9] || "").trim()
      const bulan = normalizeMonth(String(row[10] || "").trim())
      const tahun = String(row[11] || new Date().getFullYear()).trim()
      const eventId = String(row[13] || "").trim() || null
      const eventSubKategori = String(row[14] || "").trim() || null

      // Check 3: Zero amount
      if (jumlah <= 0) {
        zeroAmountCount++
        if (sampleSkipped.zeroAmount.length < 3) sampleSkipped.zeroAmount.push({ index: i, columnE: row[4], columnI: row[8], parsedAmount: jumlah })
        continue
      }

      // Check 4: Invalid month
      if (!bulan || !MONTHS.includes(bulan)) {
        invalidMonthCount++
        if (sampleSkipped.invalidMonth.length < 3) sampleSkipped.invalidMonth.push({ index: i, columnK: row[10], parsedMonth: bulan })
        continue
      }

      validCount++
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

    // Debug: log summary
    debugInfo[tab.name] = {
      totalRows: rows.length,
      emptyRowCount,
      invalidDateCount,
      zeroAmountCount,
      invalidMonthCount,
      validCount,
      sampleSkipped,
    }

    // Batch insert (Supabase handles up to 1000 rows per call)
    if (transactions.length > 0) {
      const batchSize = 500
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize)
        const { error } = await supabaseAdmin
          .from("transactions")
          .insert(batch)

        if (error) {
          console.error(`[Migrate] Error inserting ${tab.name} batch:`, error.message)
          debugInfo[tab.name].insertError = error.message
          debugInfo[tab.name].insertErrorCode = error.code
          debugInfo[tab.name].failedBatchSize = batch.length
          debugInfo[tab.name].failedBatchSample = batch.slice(0, 3)
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
      .insert(budgets)

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
      .insert(goals)

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
      .insert(debts)

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
      .upsert(settings, { onConflict: "user_id,key" })

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
