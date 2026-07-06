import { formatRp } from "./helpers"

function ratioPct(part, total) {
  if (!total) return 0
  return (part / total) * 100
}

function pickTemplate(templates, indexSeed) {
  if (!templates.length) return ""
  return templates[indexSeed % templates.length]
}

function makeIndexSeed(...values) {
  const raw = values.filter(Boolean).join("|")
  let total = 0
  for (let i = 0; i < raw.length; i += 1) total += raw.charCodeAt(i)
  return total
}

function getBudgetSignal({ budgets, allTransactions, selectedMonth, selectedYear }) {
  if (!selectedMonth || selectedMonth === "Semua Bulan") return null
  if (!selectedYear || selectedYear === "Semua Tahun") return null
  if (!budgets?.length) return null

  const monthExpenses = (allTransactions || []).filter((t) =>
    t.type === "expense" && t.month === selectedMonth && String(t.year) === String(selectedYear)
  )

  const spentByCategory = monthExpenses.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount
    return acc
  }, {})

  const relevant = budgets
    .map((budget) => {
      const spent = spentByCategory[budget.kategori] || 0
      const pct = ratioPct(spent, budget.limit)
      return { ...budget, spent, pct }
    })
    .filter((budget) => budget.limit > 0 && budget.pct >= 85)
    .sort((a, b) => b.pct - a.pct)

  const worst = relevant[0]
  if (!worst) return null

  const seed = makeIndexSeed(worst.kategori, selectedMonth, selectedYear, Math.round(worst.pct))
  if (worst.pct >= 100) {
    return {
      tone: "urgent",
      priority: 95,
      message: pickTemplate([
        `Budget ${worst.kategori} sudah lewat batas. Tahan dulu ritmenya supaya akhir bulan tidak makin berat.`,
        `${worst.kategori} sudah menembus budget bulan ini. Kalau mau napas cash flow tetap lega, mulai rem dari sini.`,
        `Pengeluaran ${worst.kategori} sudah over budget. Rapikan kategori ini dulu sebelum kebocorannya makin terasa.`,
      ], seed),
    }
  }

  return {
    tone: "caution",
    priority: 84,
    message: pickTemplate([
      `Budget ${worst.kategori} hampir habis. Kurangi sedikit ritmenya biar bulan ini tetap aman.`,
      `${worst.kategori} sudah menyentuh ${worst.pct.toFixed(0)}% budget. Jaga beberapa hari ke depan supaya tidak jebol.`,
      `Ruang budget ${worst.kategori} makin tipis. Tahan pengeluaran kecilnya dulu agar akhir bulan tetap rapi.`,
    ], seed),
  }
}

function getBillsSignal({ bills }) {
  if (!bills?.length) return null

  const sorted = [...bills].sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  const urgent = sorted.find((bill) => bill.status === "overdue" || bill.status === "due_today")
  if (urgent) {
    const seed = makeIndexSeed(urgent.nama, urgent.status, urgent.tanggalJatuhTempo)
    return {
      tone: "urgent",
      priority: 100,
      message: pickTemplate([
        `Tagihan ${urgent.nama} butuh perhatian sekarang. Siapkan saldo agar cash flow tidak ikut berantakan.`,
        `${urgent.nama} sudah jatuh tempo${urgent.status === "overdue" ? "" : " hari ini"}. Bereskan dulu supaya bulan ini tetap tenang.`,
        `Ada tagihan ${urgent.nama} yang sudah mepet. Rapikan pembayaran ini dulu sebelum fokus ke yang lain.`,
      ], seed),
    }
  }

  const dueSoon = sorted.find((bill) => bill.status === "due_soon" || (bill.daysUntilDue >= 0 && bill.daysUntilDue <= 3))
  if (!dueSoon) return null

  const seed = makeIndexSeed(dueSoon.nama, dueSoon.tanggalJatuhTempo, dueSoon.daysUntilDue)
  return {
    tone: "planning",
    priority: 88,
    message: pickTemplate([
      `Tagihan ${dueSoon.nama} mendekat. Siapkan saldo dari sekarang biar cash flow tetap rapi.`,
      `${dueSoon.nama} jatuh tempo sebentar lagi. Aman kalau kamu sisihkan dananya dari sekarang.`,
      `Ada tagihan ${dueSoon.nama} dalam waktu dekat. Cek saldo dulu supaya pembayaran nanti terasa ringan.`,
    ], seed),
  }
}

function getTopCategorySignal({ topCategory, topCategoryPct, statExpense }) {
  if (!topCategory?.name || !statExpense) return null
  if (topCategoryPct < 20) return null

  const seed = makeIndexSeed(topCategory.name, topCategoryPct)
  return {
    tone: topCategoryPct >= 30 ? "caution" : "planning",
    priority: topCategoryPct >= 30 ? 72 : 62,
    message: pickTemplate([
      `Pengeluaran ${topCategory.name} menyerap ${topCategoryPct.toFixed(0)}% bulan ini. Kalau mau hemat paling terasa, mulai dari sana.`,
      `${topCategory.name} jadi kategori terbesar bulan ini. Cek lagi area ini kalau mau menahan kebocoran halus.`,
      `Porsi ${topCategory.name} cukup besar di pengeluaranmu. Rapikan kategori ini dulu sebelum yang lain.`,
    ], seed),
  }
}

function getWealthSignal({ monthlyDelta, statSavings, statIncome, statExpense }) {
  const seed = makeIndexSeed(monthlyDelta, statSavings, statIncome, statExpense)

  if (monthlyDelta > 0 && statSavings > 0) {
    return {
      tone: "positive",
      priority: 56,
      message: pickTemplate([
        `Kekayaanmu bertumbuh ${formatRp(monthlyDelta)} bulan ini. Ritme ini bagus untuk lanjut isi tabungan atau goal.`,
        `Bulan ini kekayaanmu naik ${formatRp(monthlyDelta)}. Kalau ritme ini dijaga, tabunganmu ikut makin kuat.`,
        `Pertumbuhan kekayaanmu lagi sehat bulan ini. Momen bagus untuk tetap jaga pengeluaran tetap rapi.`,
      ], seed),
    }
  }

  if (statIncome > 0 && ratioPct(statExpense, statIncome) >= 85) {
    return {
      tone: "caution",
      priority: 68,
      message: pickTemplate([
        `Sebagian besar pemasukan bulan ini sudah terpakai. Untuk sementara, tahan pengeluaran yang bukan prioritas dulu.`,
        `Ruang surplus bulan ini lagi tipis. Jaga ritme belanja beberapa hari ke depan supaya tetap aman.`,
        `Pengeluaranmu sudah mendekati pemasukan bulan ini. Rapikan tempo belanja dulu biar napas cash flow tetap lega.`,
      ], seed),
    }
  }

  return null
}

function getInsightsSignal({ insights }) {
  const first = (insights || [])[0]
  if (!first?.text) return null

  const seed = makeIndexSeed(first.text, first.type)
  if (first.type === "warning") {
    return {
      tone: "caution",
      priority: 76,
      message: pickTemplate([
        `${first.text}. Cek detailnya sekarang biar tidak jadi masalah yang lebih besar.`,
        `${first.text}. Rapikan dari titik ini dulu supaya kondisi bulan ini tetap terkendali.`,
      ], seed),
    }
  }

  if (first.type === "positive") {
    return {
      tone: "positive",
      priority: 52,
      message: pickTemplate([
        `${first.text}. Pertahankan ritme ini supaya kekayaanmu terus tumbuh sehat.`,
        `${first.text}. Ini sinyal bagus, tinggal dijaga konsistensinya.`,
      ], seed),
    }
  }

  return {
    tone: "planning",
    priority: 44,
    message: pickTemplate([
      `${first.text}. Kalau sempat, jadikan ini titik cek kecil untuk hari ini.`,
      `${first.text}. Catat ini sebagai pengingat kecil biar ritme keuanganmu tetap rapi.`,
    ], seed),
  }
}

function getFallbackSignal({ selectedMonth, monthlyDelta }) {
  const seed = makeIndexSeed(selectedMonth, monthlyDelta)
  return {
    tone: "neutral",
    priority: 1,
    message: pickTemplate([
      `Belum ada sinyal darurat hari ini. Fokus jaga pemasukan, pengeluaran, dan tabungan tetap seimbang.`,
      `Keuanganmu lagi relatif tenang. Gunakan momen ini untuk jaga ritme yang sudah bagus.`,
      `Hari ini belum ada hal yang mendesak. Cukup pantau kategori terbesar dan jaga pengeluaran tetap rapi.`,
    ], seed),
  }
}

export function getFocusNote({
  budgets,
  bills,
  allTransactions,
  selectedMonth,
  selectedYear,
  topCategory,
  topCategoryPct,
  monthlyDelta,
  statSavings,
  statIncome,
  statExpense,
  insights,
}) {
  const candidates = [
    getBillsSignal({ bills }),
    getBudgetSignal({ budgets, allTransactions, selectedMonth, selectedYear }),
    getInsightsSignal({ insights }),
    getTopCategorySignal({ topCategory, topCategoryPct, statExpense }),
    getWealthSignal({ monthlyDelta, statSavings, statIncome, statExpense }),
    getFallbackSignal({ selectedMonth, monthlyDelta }),
  ].filter(Boolean)

  const best = candidates.sort((a, b) => b.priority - a.priority)[0]
  return {
    label: "Fokus Hari Ini",
    tone: best.tone,
    message: best.message,
  }
}
