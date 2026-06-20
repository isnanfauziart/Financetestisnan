import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"

function formatRpFull(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

function esc(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function pct(value, total) {
  if (!total || total === 0) return "0"
  return ((value / total) * 100).toFixed(1)
}

function prevMonth(month, year) {
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx <= 0) return { month: AVAILABLE_MONTHS[11], year: String(Number(year) - 1) }
  return { month: AVAILABLE_MONTHS[idx - 1], year }
}

/**
 * Generate a printable HTML monthly report.
 *
 * @param {Object} params
 * @param {string} params.month — e.g. "Jun"
 * @param {string} params.year — e.g. "2026"
 * @param {Array}  params.transactions — filtered to month/year
 * @param {Array}  params.budgets — filtered to month/year
 * @param {Array}  params.allTransactions — all transactions
 * @param {Array}  params.monthlyData — full monthlyData (for trend context)
 * @param {Object} [params.healthScore] — { score, grade } from computeHealthScore
 * @returns {string} — complete HTML document string
 */
export function generateReportHTML({
  month,
  year,
  transactions,
  budgets,
  allTransactions,
  monthlyData,
  healthScore,
}) {
  const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const savings = transactions.filter((t) => t.type === "savings").reduce((s, t) => s + t.amount, 0)
  const surplus = income - expense
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

  // Expense by category
  const expenseByCategory = {}
  for (const t of transactions) {
    if (t.type !== "expense") continue
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  }
  const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])

  // Top 10 transactions
  const top10 = transactions
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Previous month comparison
  const prev = prevMonth(month, year)
  const prevTx = (monthlyData || []).find((m) => m.month === prev.month && String(m.year || "") === prev.year)
  const prevIncome = prevTx ? prevTx.pemasukan : 0
  const prevExpense = prevTx ? prevTx.pengeluaran : 0
  const prevSurplus = prevIncome - prevExpense

  // Budget adherence
  const budgetRows = (budgets || []).map((b) => {
    const spent = expenseByCategory[b.kategori] || 0
    const limit = b.limit || 0
    const usedPct = limit > 0 ? (spent / limit) * 100 : 0
    const status = usedPct >= 100 ? "Over" : usedPct >= 90 ? "Hampir" : usedPct >= 70 ? "Warning" : "Sehat"
    return { ...b, spent, usedPct, status }
  })

  const timestamp = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Laporan Keuangan ${esc(month)} ${esc(year)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #2a2018;
    background: #ffffff;
    line-height: 1.6;
    font-size: 11pt;
    padding: 24pt;
    max-width: 800px;
    margin: 0 auto;
  }
  h1 {
    font-size: 18pt;
    font-weight: 700;
    text-align: center;
    margin-bottom: 2pt;
    letter-spacing: 0.05em;
  }
  .subtitle {
    text-align: center;
    color: #6b5b4f;
    font-size: 10pt;
    margin-bottom: 20pt;
    padding-bottom: 12pt;
    border-bottom: 2pt solid #ede0d0;
  }
  h2 {
    font-size: 12pt;
    font-weight: 700;
    color: #4a3d33;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1.5pt solid #ede0d0;
    padding-bottom: 4pt;
    margin-top: 18pt;
    margin-bottom: 8pt;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
  }
  th {
    text-align: left;
    font-size: 8pt;
    font-weight: 700;
    color: #6b5b4f;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 4pt 6pt;
    border-bottom: 1pt solid #ede0d0;
  }
  td {
    padding: 4pt 6pt;
    font-size: 10pt;
    color: #4a3d33;
    border-bottom: 0.5pt solid #f6efe5;
  }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  .positive { color: #5b8c7a; }
  .negative { color: #c47d5a; }
  .danger { color: #c44545; }
  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8pt;
    margin-bottom: 12pt;
  }
  .summary-item {
    border: 1pt solid #ede0d0;
    border-radius: 6pt;
    padding: 8pt 10pt;
  }
  .summary-label {
    font-size: 8pt;
    font-weight: 700;
    color: #9c8978;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .summary-value {
    font-size: 14pt;
    font-weight: 700;
    color: #2a2018;
    font-variant-numeric: tabular-nums;
  }
  .badge {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    padding: 2pt 6pt;
    border-radius: 3pt;
    text-transform: uppercase;
  }
  .badge-sehat { background: #ebf3f0; color: #5b8c7a; }
  .badge-warning { background: #fdf7e8; color: #d4a853; }
  .badge-over { background: #fbecec; color: #c44545; }
  .footer {
    margin-top: 24pt;
    padding-top: 8pt;
    border-top: 1pt solid #ede0d0;
    font-size: 8pt;
    color: #9c8978;
    text-align: center;
  }
  .delta-positive { color: #5b8c7a; font-size: 9pt; }
  .delta-negative { color: #c47d5a; font-size: 9pt; }
  @media print {
    body { padding: 12pt; }
    .no-print { display: none !important; }
    .summary-item { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<h1>LAPORAN KEUANGAN BULANAN</h1>
<p class="subtitle">${esc(month)} ${esc(year)} &mdash; Keuangan Isnan Finance</p>

${healthScore ? `
<div style="text-align:center; margin-bottom:12pt;">
  <span style="font-size:9pt; color:#6b5b4f;">Skor Kesehatan Keuangan:</span>
  <span style="font-size:20pt; font-weight:700; color:${esc(healthScore.gradeColor || '#2a2018')}; margin-left:6pt;">${esc(healthScore.grade)}</span>
  <span style="font-size:12pt; font-weight:700; color:#6b5b4f; margin-left:4pt;">(${healthScore.score})</span>
</div>
` : ""}

<h2>Ringkasan</h2>
<div class="summary-grid">
  <div class="summary-item">
    <div class="summary-label">Total Pemasukan</div>
    <div class="summary-value positive">${formatRpFull(income)}</div>
  </div>
  <div class="summary-item">
    <div class="summary-label">Total Pengeluaran</div>
    <div class="summary-value negative">${formatRpFull(expense)}</div>
  </div>
  <div class="summary-item">
    <div class="summary-label">Total Tabungan</div>
    <div class="summary-value">${formatRpFull(savings)}</div>
  </div>
  <div class="summary-item">
    <div class="summary-label">Surplus</div>
    <div class="summary-value ${surplus >= 0 ? 'positive' : 'negative'}">${formatRpFull(surplus)}</div>
  </div>
  <div class="summary-item">
    <div class="summary-label">Savings Rate</div>
    <div class="summary-value">${savingsRate.toFixed(1)}%</div>
  </div>
  <div class="summary-item">
    <div class="summary-label">Jumlah Transaksi</div>
    <div class="summary-value">${transactions.length}</div>
  </div>
</div>

${sortedCategories.length > 0 ? `
<h2>Pengeluaran per Kategori</h2>
<table>
  <thead>
    <tr>
      <th>Kategori</th>
      <th class="num">Jumlah</th>
      <th class="num">% Total</th>
    </tr>
  </thead>
  <tbody>
    ${sortedCategories.map(([cat, val]) => `
    <tr>
      <td>${esc(cat)}</td>
      <td class="num">${formatRpFull(val)}</td>
      <td class="num">${pct(val, expense)}%</td>
    </tr>`).join("")}
  </tbody>
</table>
` : ""}

${budgetRows.length > 0 ? `
<h2>Anggaran vs Realisasi</h2>
<table>
  <thead>
    <tr>
      <th>Kategori</th>
      <th class="num">Terpakai</th>
      <th class="num">Limit</th>
      <th class="num">%</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${budgetRows.map((b) => {
      const badgeClass = b.usedPct >= 100 ? "badge-over" : b.usedPct >= 70 ? "badge-warning" : "badge-sehat"
      return `
    <tr>
      <td>${esc(b.kategori)}</td>
      <td class="num">${formatRpFull(b.spent)}</td>
      <td class="num">${formatRpFull(b.limit)}</td>
      <td class="num">${b.usedPct.toFixed(0)}%</td>
      <td><span class="badge ${badgeClass}">${esc(b.status)}</span></td>
    </tr>`
    }).join("")}
  </tbody>
</table>
` : ""}

${top10.length > 0 ? `
<h2>Top 10 Transaksi Terbesar</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Kategori</th>
      <th>Keterangan</th>
      <th>Tanggal</th>
      <th class="num">Jumlah</th>
    </tr>
  </thead>
  <tbody>
    ${top10.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(t.category)}</td>
      <td>${esc(t.desc || "\u2014")}</td>
      <td>${esc(t.date || "")}</td>
      <td class="num negative">-${formatRpFull(t.amount)}</td>
    </tr>`).join("")}
  </tbody>
</table>
` : ""}

${prevTx ? `
<h2>Perbandingan Bulan Lalu (${esc(prev.month)})</h2>
<table>
  <thead>
    <tr>
      <th>Metrik</th>
      <th class="num">${esc(prev.month)} ${esc(prev.year)}</th>
      <th class="num">${esc(month)} ${esc(year)}</th>
      <th class="num">Perubahan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Pemasukan</td>
      <td class="num">${formatRpFull(prevIncome)}</td>
      <td class="num">${formatRpFull(income)}</td>
      <td class="num ${income >= prevIncome ? 'delta-positive' : 'delta-negative'}">${income >= prevIncome ? "\u2191" : "\u2193"} ${prevIncome > 0 ? Math.abs(((income - prevIncome) / prevIncome) * 100).toFixed(0) : "0"}%</td>
    </tr>
    <tr>
      <td>Pengeluaran</td>
      <td class="num">${formatRpFull(prevExpense)}</td>
      <td class="num">${formatRpFull(expense)}</td>
      <td class="num ${expense <= prevExpense ? 'delta-positive' : 'delta-negative'}">${expense <= prevExpense ? "\u2193" : "\u2191"} ${prevExpense > 0 ? Math.abs(((expense - prevExpense) / prevExpense) * 100).toFixed(0) : "0"}%</td>
    </tr>
    <tr>
      <td>Surplus</td>
      <td class="num ${prevSurplus >= 0 ? 'positive' : 'negative'}">${formatRpFull(prevSurplus)}</td>
      <td class="num ${surplus >= 0 ? 'positive' : 'negative'}">${formatRpFull(surplus)}</td>
      <td class="num ${surplus >= prevSurplus ? 'delta-positive' : 'delta-negative'}">${surplus >= prevSurplus ? "\u2191" : "\u2193"} ${formatRpFull(Math.abs(surplus - prevSurplus))}</td>
    </tr>
  </tbody>
</table>
` : ""}

<div class="footer">
  Dibuat otomatis oleh Keuangan Isnan Finance &mdash; ${timestamp}
</div>

</body>
</html>`
}
