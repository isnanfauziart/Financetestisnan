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
    padding: 0;
    max-width: 800px;
    margin: 0 auto;
  }
  .header-stripe {
    height: 5pt;
    background: linear-gradient(135deg, #7c5fcf 0%, #5b8c7a 50%, #7c8c5a 100%);
  }
  .header-area {
    text-align: center;
    padding: 28pt 24pt 18pt;
    background: #f8f4ee;
  }
  .header-area h1 {
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #2a2018;
    margin-bottom: 3pt;
  }
  .header-area .subtitle {
    font-size: 10pt;
    color: #6b5b4f;
    letter-spacing: 0.02em;
  }
  .header-divider {
    height: 1.5pt;
    background: #ede0d0;
    margin: 0 24pt;
  }
  .content { padding: 18pt 24pt 24pt; }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    color: #4a3d33;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 20pt;
    margin-bottom: 10pt;
  }
  .section-title-bar {
    display: inline-block;
    width: 3pt;
    height: 14pt;
    background: #7c5fcf;
    vertical-align: middle;
    margin-right: 8pt;
  }
  .section-hr {
    border: none;
    height: 1pt;
    background: #ede0d0;
    margin: 0 0 10pt 0;
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
    padding: 5pt 6pt;
    border-bottom: 1.5pt solid #ede0d0;
  }
  td {
    padding: 5pt 6pt;
    font-size: 10pt;
    color: #4a3d33;
    border-bottom: 0.5pt solid #f6efe5;
  }
  td.num { text-align: right; }
  th.num { text-align: right; }
  .positive { color: #5b8c7a; }
  .negative { color: #c47d5a; }
  .danger { color: #c44545; }
  .health-section {
    text-align: center;
    margin: 14pt 0 6pt;
  }
  .health-badge {
    display: inline-block;
    width: 52pt;
    height: 52pt;
    line-height: 52pt;
    text-align: center;
    border: 3.5pt solid #6b5b4f;
    font-size: 22pt;
    font-weight: 800;
    color: #2a2018;
  }
  .health-meta {
    margin-top: 4pt;
    font-size: 9pt;
    color: #6b5b4f;
  }
  .health-meta .score-num {
    font-weight: 700;
    margin-left: 3pt;
  }
  .summary-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8pt;
    margin-bottom: 6pt;
  }
  .summary-card {
    border: 1pt solid #ede0d0;
    border-radius: 8pt;
    padding: 10pt 12pt;
    vertical-align: top;
  }
  .summary-emoji {
    font-size: 18pt;
    line-height: 1;
    margin-bottom: 4pt;
  }
  .summary-label {
    font-size: 7.5pt;
    font-weight: 700;
    color: #9c8978;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2pt;
  }
  .summary-value {
    font-size: 14pt;
    font-weight: 700;
    color: #2a2018;
    line-height: 1.2;
  }
  .bar-chart-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14pt;
  }
  .bar-chart-table td {
    padding: 3pt 4pt;
    border: none;
    vertical-align: middle;
  }
  .bar-label-cell {
    width: 110pt;
    text-align: right;
    font-size: 8.5pt;
    color: #4a3d33;
    white-space: nowrap;
    overflow: hidden;
  }
  .bar-track-cell {
    width: auto;
  }
  .bar-track {
    height: 14pt;
    background: #f6efe5;
    border-radius: 3pt;
    overflow: hidden;
  }
  .bar-fill {
    height: 14pt;
    border-radius: 3pt;
  }
  .bar-amount-cell {
    width: 80pt;
    text-align: right;
    font-size: 8pt;
    color: #6b5b4f;
  }
  .budget-bar-track {
    height: 7pt;
    background: #f6efe5;
    border-radius: 3pt;
    overflow: hidden;
    width: 80pt;
  }
  .budget-bar-fill {
    height: 7pt;
    border-radius: 3pt;
  }
  .badge {
    display: inline-block;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 2pt 6pt;
    border-radius: 3pt;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .badge-sehat { background: #ebf3f0; color: #5b8c7a; }
  .badge-warning { background: #fdf7e8; color: #d4a853; }
  .badge-over { background: #fbecec; color: #c44545; }
  .compare-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8pt;
    margin-bottom: 6pt;
  }
  .compare-card {
    border: 1pt solid #ede0d0;
    border-radius: 8pt;
    padding: 10pt 12pt;
    vertical-align: top;
  }
  .compare-bar-table {
    width: 100%;
    border-collapse: collapse;
  }
  .compare-bar-table td {
    padding: 0;
    border: none;
    vertical-align: bottom;
    text-align: center;
  }
  .compare-bar {
    display: block;
    width: 100%;
    min-height: 2pt;
    border-radius: 2pt 2pt 0 0;
  }
  .compare-label {
    font-size: 7pt;
    color: #9c8978;
    margin-bottom: 2pt;
  }
  .compare-value {
    font-size: 7pt;
    color: #6b5b4f;
    margin-top: 2pt;
  }
  .footer {
    margin-top: 20pt;
    padding: 10pt 24pt 14pt;
    font-size: 8pt;
    color: #9c8978;
    text-align: center;
  }
  .footer-hr {
    border: none;
    height: 1.5pt;
    background: #ede0d0;
    margin: 0 0 10pt 0;
  }
  .footer-stripe {
    height: 3pt;
    background: linear-gradient(135deg, #7c5fcf 0%, #5b8c7a 50%, #7c8c5a 100%);
    margin-top: 10pt;
  }
  .delta-positive { color: #5b8c7a; font-size: 9pt; font-weight: 600; }
  .delta-negative { color: #c47d5a; font-size: 9pt; font-weight: 600; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    tr { page-break-inside: avoid; }
    .header-stripe, .footer-stripe, .bar-fill, .budget-bar-fill, .compare-bar, .health-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header-stripe"></div>
<div class="header-area">
  <h1>LAPORAN KEUANGAN BULANAN</h1>
  <p class="subtitle">${esc(month)} ${esc(year)} &mdash; Artoku</p>
</div>
<div class="header-divider"></div>
<div class="content">

${healthScore ? `
<div class="health-section">
  <div class="health-badge" style="border-color:${esc(healthScore.gradeColor || '#6b5b4f')}; color:${esc(healthScore.gradeColor || '#2a2018')};">${esc(healthScore.grade)}</div>
  <div class="health-meta">Skor Kesehatan Keuangan: <span class="score-num">${healthScore.score}</span></div>
</div>
` : ""}

<h2 class="section-title"><span class="section-title-bar"></span>Ringkasan</h2>
<hr class="section-hr">
<table class="summary-table">
  <tr>
    <td width="50%" style="padding-right:4pt;">
      <div class="summary-card" style="border-left:3pt solid #7c8c5a; background:#f4f6ec;">
        <div class="summary-emoji">💰</div>
        <div class="summary-label">Total Pemasukan</div>
        <div class="summary-value positive">${formatRpFull(income)}</div>
      </div>
    </td>
    <td width="50%" style="padding-left:4pt;">
      <div class="summary-card" style="border-left:3pt solid #c47d5a; background:#fbf0e9;">
        <div class="summary-emoji">📉</div>
        <div class="summary-label">Total Pengeluaran</div>
        <div class="summary-value negative">${formatRpFull(expense)}</div>
      </div>
    </td>
  </tr>
  <tr>
    <td width="50%" style="padding-right:4pt;">
      <div class="summary-card" style="border-left:3pt solid #5b8c7a; background:#ebf3f0;">
        <div class="summary-emoji">🐷</div>
        <div class="summary-label">Total Tabungan</div>
        <div class="summary-value">${formatRpFull(savings)}</div>
      </div>
    </td>
    <td width="50%" style="padding-left:4pt;">
      <div class="summary-card" style="border-left:3pt solid ${surplus >= 0 ? '#5b8c7a' : '#c47d5a'}; background:${surplus >= 0 ? '#ebf3f0' : '#fbf0e9'};">
        <div class="summary-emoji">📊</div>
        <div class="summary-label">Surplus</div>
        <div class="summary-value ${surplus >= 0 ? 'positive' : 'negative'}">${formatRpFull(surplus)}</div>
      </div>
    </td>
  </tr>
  <tr>
    <td width="50%" style="padding-right:4pt;">
      <div class="summary-card" style="border-left:3pt solid #7c5fcf; background:#f3effc;">
        <div class="summary-emoji">🔖</div>
        <div class="summary-label">Savings Rate</div>
        <div class="summary-value">${savingsRate.toFixed(1)}%</div>
      </div>
    </td>
    <td width="50%" style="padding-left:4pt;">
      <div class="summary-card" style="border-left:3pt solid #9c8978; background:#f6efe5;">
        <div class="summary-emoji">📋</div>
        <div class="summary-label">Jumlah Transaksi</div>
        <div class="summary-value">${transactions.length}</div>
      </div>
    </td>
  </tr>
</table>

${sortedCategories.length > 0 ? `
<h2 class="section-title"><span class="section-title-bar"></span>Pengeluaran per Kategori</h2>
<hr class="section-hr">
<table class="bar-chart-table">
  ${sortedCategories.slice(0, 8).map(([cat, val], i) => {
    const maxVal = sortedCategories[0][1]
    const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0
    const colors = ["#7c8c5a","#c47d5a","#5b8c7a","#9f87ef","#d4a853","#5069cc","#c44545","#7aab9a"]
    const color = colors[i % colors.length]
    return `
  <tr>
    <td class="bar-label-cell">${esc(cat)}</td>
    <td class="bar-track-cell">
      <div class="bar-track"><div class="bar-fill" style="width:${barPct}%; background:${color};"></div></div>
    </td>
    <td class="bar-amount-cell">${formatRpFull(val)}</td>
  </tr>`
  }).join("")}
</table>
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
<h2 class="section-title"><span class="section-title-bar"></span>Anggaran vs Realisasi</h2>
<hr class="section-hr">
<table>
  <thead>
    <tr>
      <th>Kategori</th>
      <th class="num">Terpakai</th>
      <th>Progres</th>
      <th class="num">Limit</th>
      <th class="num">%</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${budgetRows.map((b) => {
      const badgeClass = b.usedPct >= 100 ? "badge-over" : b.usedPct >= 70 ? "badge-warning" : "badge-sehat"
      const barColor = b.usedPct >= 100 ? "#c44545" : b.usedPct >= 90 ? "#d4a853" : b.usedPct >= 70 ? "#d4a853" : "#5b8c7a"
      const barWidth = Math.min(b.usedPct, 100)
      return `
    <tr>
      <td>${esc(b.kategori)}</td>
      <td class="num">${formatRpFull(b.spent)}</td>
      <td class="budget-progress-cell">
        <div class="budget-bar-track">
          <div class="budget-bar-fill" style="width:${barWidth}%; background:${barColor};"></div>
        </div>
      </td>
      <td class="num">${formatRpFull(b.limit)}</td>
      <td class="num">${b.usedPct.toFixed(0)}%</td>
      <td><span class="badge ${badgeClass}">${esc(b.status)}</span></td>
    </tr>`
    }).join("")}
  </tbody>
</table>
` : ""}

${top10.length > 0 ? `
<h2 class="section-title"><span class="section-title-bar"></span>Top 10 Transaksi Terbesar</h2>
<hr class="section-hr">
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
<h2 class="section-title"><span class="section-title-bar"></span>Perbandingan Bulan Lalu (${esc(prev.month)})</h2>
<hr class="section-hr">
<table class="compare-table">
  ${(() => {
    const maxInc = Math.max(income, prevIncome) || 1
    const maxExp = Math.max(expense, prevExpense) || 1
    const maxSur = Math.max(Math.abs(surplus), Math.abs(prevSurplus)) || 1
    return `
  <tr>
    <td width="33%" style="padding-right:4pt;">
      <div class="compare-card" style="border-left:3pt solid #7c8c5a;">
        <div class="summary-label">Pemasukan</div>
        <table class="compare-bar-table" style="margin-top:6pt;">
          <tr>
            <td width="50%">
              <div class="compare-label">${esc(prev.month)}</div>
              <div class="compare-bar" style="height:${(prevIncome / maxInc) * 28}pt; background:#d5ddc8;"></div>
              <div class="compare-value">${formatRpFull(prevIncome)}</div>
            </td>
            <td width="50%">
              <div class="compare-label">${esc(month)}</div>
              <div class="compare-bar" style="height:${(income / maxInc) * 28}pt; background:#7c8c5a;"></div>
              <div class="compare-value">${formatRpFull(income)}</div>
            </td>
          </tr>
        </table>
      </div>
    </td>
    <td width="33%" style="padding-left:4pt; padding-right:4pt;">
      <div class="compare-card" style="border-left:3pt solid #c47d5a;">
        <div class="summary-label">Pengeluaran</div>
        <table class="compare-bar-table" style="margin-top:6pt;">
          <tr>
            <td width="50%">
              <div class="compare-label">${esc(prev.month)}</div>
              <div class="compare-bar" style="height:${(prevExpense / maxExp) * 28}pt; background:#e0c5b5;"></div>
              <div class="compare-value">${formatRpFull(prevExpense)}</div>
            </td>
            <td width="50%">
              <div class="compare-label">${esc(month)}</div>
              <div class="compare-bar" style="height:${(expense / maxExp) * 28}pt; background:#c47d5a;"></div>
              <div class="compare-value">${formatRpFull(expense)}</div>
            </td>
          </tr>
        </table>
      </div>
    </td>
    <td width="33%" style="padding-left:4pt;">
      <div class="compare-card" style="border-left:3pt solid ${surplus >= 0 ? '#5b8c7a' : '#c47d5a'};">
        <div class="summary-label">Surplus</div>
        <table class="compare-bar-table" style="margin-top:6pt;">
          <tr>
            <td width="50%">
              <div class="compare-label">${esc(prev.month)}</div>
              <div class="compare-bar" style="height:${(Math.abs(prevSurplus) / maxSur) * 28}pt; background:${prevSurplus >= 0 ? '#c0d4c8' : '#e0c5b5'};"></div>
              <div class="compare-value">${formatRpFull(prevSurplus)}</div>
            </td>
            <td width="50%">
              <div class="compare-label">${esc(month)}</div>
              <div class="compare-bar" style="height:${(Math.abs(surplus) / maxSur) * 28}pt; background:${surplus >= 0 ? '#5b8c7a' : '#c47d5a'};"></div>
              <div class="compare-value">${formatRpFull(surplus)}</div>
            </td>
          </tr>
        </table>
      </div>
    </td>
  </tr>`
  })()}
</table>
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

<hr class="footer-hr">
<div class="footer">
  Dibuat otomatis oleh Artoku &mdash; ${timestamp}
</div>
</div><!-- /.content -->
<div class="footer-stripe"></div>

</body>
</html>`
}

/**
 * Generate a printable HTML annual report (Year-in-Review).
 *
 * @param {Object} params
 * @param {string} params.year — e.g. "2026"
 * @param {Array}  params.transactions — all transactions filtered to year
 * @param {Array}  params.monthlyData — full monthlyData (for trend context)
 * @returns {string} — complete HTML document string
 */
export function generateAnnualReportHTML({ year, transactions, monthlyData }) {
  const yearTx = (transactions || []).filter(t => String(t.year) === String(year))
  const yearMonthly = (monthlyData || []).filter(m => String(m.year) === String(year))

  const income = yearTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const expense = yearTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const savings = yearTx.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)
  const surplus = income - expense
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

  // Top categories
  const expenseByCategory = {}
  for (const t of yearTx) {
    if (t.type !== "expense") continue
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  }
  const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])

  // Biggest transaction
  const biggestTx = yearTx.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount)[0]

  // Most expensive month
  const monthExpense = {}
  for (const m of yearMonthly) {
    if (m.pengeluaran > 0) monthExpense[`${m.month} ${m.year || year}`] = m.pengeluaran
  }
  const sortedMonths = Object.entries(monthExpense).sort((a, b) => b[1] - a[1])
  const worstMonth = sortedMonths[0]

  // Best savings month
  const monthSavings = {}
  for (const m of yearMonthly) {
    const sr = m.pemasukan > 0 ? ((m.pemasukan - m.pengeluaran) / m.pemasukan) * 100 : 0
    monthSavings[`${m.month} ${m.year || year}`] = sr
  }
  const sortedSavingsMonths = Object.entries(monthSavings).sort((a, b) => b[1] - a[1])
  const bestSavingsMonth = sortedSavingsMonths[0]

  // Daily stats
  const dailySpend = {}
  for (const t of yearTx) {
    if (t.type !== "expense" || !t.date) continue
    const dayKey = t.date
    dailySpend[dayKey] = (dailySpend[dayKey] || 0) + t.amount
  }
  const dailyValues = Object.values(dailySpend)
  const avgDaily = dailyValues.length > 0 ? dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length : 0

  // Most expensive day
  const sortedDays = Object.entries(dailySpend).sort((a, b) => b[1] - a[1])
  const worstDay = sortedDays[0]

  // Net worth change (from monthlyData)
  let netWorthStart = 0
  let netWorthEnd = 0
  let cum = 0
  const sortedYearMonthly = [...yearMonthly].sort((a, b) => {
    const aIdx = AVAILABLE_MONTHS.indexOf(a.month)
    const bIdx = AVAILABLE_MONTHS.indexOf(b.month)
    return aIdx - bIdx
  })
  for (const m of sortedYearMonthly) {
    cum += (m.pemasukan - m.pengeluaran) + (m.tabungan || 0)
    if (netWorthStart === 0) netWorthStart = cum
    netWorthEnd = cum
  }
  const netWorthGrowth = netWorthStart > 0 ? ((netWorthEnd - netWorthStart) / Math.abs(netWorthStart)) * 100 : 0

  // Savings rate by month (for inline chart)
  const monthlyRates = sortedYearMonthly.map(m => {
    const sr = m.pemasukan > 0 ? ((m.pemasukan - m.pengeluaran) / m.pemasukan) * 100 : 0
    return { month: m.month, rate: sr }
  })
  const maxRate = Math.max(...monthlyRates.map(r => Math.abs(r.rate)), 1)

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
<title>Year-in-Review ${esc(year)} — Artoku</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #2a2018;
    background: #ffffff;
    line-height: 1.6;
    font-size: 11pt;
    padding: 0;
    max-width: 800px;
    margin: 0 auto;
  }
  .header-stripe { height: 6pt; background: linear-gradient(135deg, #7c5fcf 0%, #9f87ef 30%, #5b8c7a 60%, #7c8c5a 100%); }
  .hero {
    text-align: center;
    padding: 32pt 24pt 24pt;
    background: #4a3d33;
    color: white;
  }
  .hero h1 { font-size: 28pt; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 4pt; }
  .hero .year { font-size: 48pt; font-weight: 800; opacity: 0.9; }
  .hero .subtitle { font-size: 11pt; opacity: 0.7; margin-top: 6pt; }
  .content { padding: 18pt 24pt 24pt; }
  .section-title {
    font-size: 11pt; font-weight: 700; color: #4a3d33;
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-top: 24pt; margin-bottom: 12pt;
  }
  .section-title-bar {
    display: inline-block; width: 3pt; height: 14pt;
    background: #7c5fcf; vertical-align: middle; margin-right: 8pt;
  }
  .section-hr { border: none; height: 1pt; background: #ede0d0; margin: 0 0 12pt 0; }
  .grid-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 10pt;
    margin-bottom: 6pt;
  }
  .card {
    border: 1pt solid #ede0d0; border-radius: 10pt; padding: 14pt;
    text-align: center;
  }
  .card .label { font-size: 8pt; font-weight: 700; color: #9c8978; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4pt; }
  .card .value { font-size: 18pt; font-weight: 700; line-height: 1.2; }
  .card .sub { font-size: 8pt; color: #9c8978; margin-top: 2pt; }
  .highlight-card {
    border: 2pt solid; border-radius: 10pt; padding: 14pt;
    margin-bottom: 10pt;
  }
  .highlight-card .label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4pt; }
  .highlight-card .value { font-size: 14pt; font-weight: 700; }
  .highlight-card .detail { font-size: 9pt; margin-top: 3pt; }
  .bar-chart-table {
    width: 100%; border-collapse: collapse; margin-bottom: 14pt;
  }
  .bar-chart-table td { padding: 3pt 4pt; border: none; vertical-align: middle; }
  .bar-label-cell { width: 100pt; text-align: right; font-size: 8.5pt; color: #4a3d33; white-space: nowrap; overflow: hidden; }
  .bar-track { height: 14pt; background: #f6efe5; border-radius: 3pt; overflow: hidden; }
  .bar-fill { height: 14pt; border-radius: 3pt; }
  .bar-amount-cell { width: 70pt; text-align: right; font-size: 8pt; color: #6b5b4f; }
  .monthly-chart-table { width: 100%; border-collapse: collapse; }
  .monthly-chart-table td { padding: 0 2pt; border: none; vertical-align: bottom; text-align: center; }
  .monthly-bar { display: block; width: 100%; min-height: 2pt; border-radius: 3pt 3pt 0 0; }
  .monthly-label { font-size: 7pt; color: #9c8978; padding-top: 3pt; }
  .positive { color: #5b8c7a; }
  .negative { color: #c47d5a; }
  .footer { margin-top: 24pt; padding: 10pt 24pt 14pt; font-size: 8pt; color: #9c8978; text-align: center; }
  .footer-hr { border: none; height: 1.5pt; background: #ede0d0; margin: 0 0 10pt 0; }
  .footer-stripe { height: 4pt; background: linear-gradient(135deg, #7c5fcf 0%, #9f87ef 30%, #5b8c7a 60%, #7c8c5a 100%); }
  @media print {
    body { padding: 0; }
    .header-stripe, .hero, .bar-fill, .monthly-bar, .footer-stripe { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header-stripe"></div>
<div class="hero">
  <h1>YEAR IN REVIEW</h1>
  <div class="year">${esc(year)}</div>
  <p class="subtitle">Artoku Finance Dashboard</p>
</div>
<div class="content">

<h2 class="section-title"><span class="section-title-bar"></span>Ringkasan Tahunan</h2>
<hr class="section-hr">
<table class="grid-table">
  <tr>
    <td width="50%" style="padding-right:5pt;">
      <div class="card" style="border-left:3pt solid #7c8c5a; background:#f4f6ec;">
        <div class="label">Total Pemasukan</div>
        <div class="value positive">${formatRpFull(income)}</div>
        <div class="sub">${yearTx.filter(t => t.type === "income").length} transaksi</div>
      </div>
    </td>
    <td width="50%" style="padding-left:5pt;">
      <div class="card" style="border-left:3pt solid #c47d5a; background:#fbf0e9;">
        <div class="label">Total Pengeluaran</div>
        <div class="value negative">${formatRpFull(expense)}</div>
        <div class="sub">${yearTx.filter(t => t.type === "expense").length} transaksi</div>
      </div>
    </td>
  </tr>
  <tr>
    <td width="50%" style="padding-right:5pt;">
      <div class="card" style="border-left:3pt solid #5b8c7a; background:#ebf3f0;">
        <div class="label">Total Tabungan</div>
        <div class="value" style="color:#5b8c7a">${formatRpFull(savings)}</div>
        <div class="sub">${yearTx.filter(t => t.type === "savings").length} transaksi</div>
      </div>
    </td>
    <td width="50%" style="padding-left:5pt;">
      <div class="card" style="border-left:3pt solid ${surplus >= 0 ? '#5b8c7a' : '#c47d5a'}; background:${surplus >= 0 ? '#ebf3f0' : '#fbf0e9'};">
        <div class="label">Surplus</div>
        <div class="value ${surplus >= 0 ? 'positive' : 'negative'}">${formatRpFull(surplus)}</div>
        <div class="sub">Savings Rate: ${savingsRate.toFixed(1)}%</div>
      </div>
    </td>
  </tr>
</table>

<h2 class="section-title"><span class="section-title-bar"></span>Highlights</h2>
<hr class="section-hr">
${biggestTx ? `
<div class="highlight-card" style="border-color:#c47d5a; background:#fbf0e9;">
  <div class="label" style="color:#c47d5a;">Pengeluaran Terbesar</div>
  <div class="value negative">${formatRpFull(biggestTx.amount)}</div>
  <div class="detail" style="color:#6b5b4f;">${esc(biggestTx.category)} — ${esc(biggestTx.desc || "—")} · ${esc(biggestTx.date || "")}</div>
</div>` : ""}
${worstMonth ? `
<div class="highlight-card" style="border-color:#d4a853; background:#fdf7e8;">
  <div class="label" style="color:#d4a853;">Bulan Terboros</div>
  <div class="value" style="color:#c47d5a">${formatRpFull(worstMonth[1])}</div>
  <div class="detail" style="color:#6b5b4f;">${esc(worstMonth[0])}</div>
</div>` : ""}
${bestSavingsMonth ? `
<div class="highlight-card" style="border-color:#5b8c7a; background:#ebf3f0;">
  <div class="label" style="color:#5b8c7a;">Savings Rate Terbaik</div>
  <div class="value positive">${bestSavingsMonth[1].toFixed(1)}%</div>
  <div class="detail" style="color:#6b5b4f;">${esc(bestSavingsMonth[0])}</div>
</div>` : ""}
${worstDay ? `
<div class="highlight-card" style="border-color:#9f87ef; background:#f3effc;">
  <div class="label" style="color:#9f87ef;">Hari Paling Boros</div>
  <div class="value" style="color:#c47d5a">${formatRpFull(worstDay[1])}</div>
  <div class="detail" style="color:#6b5b4f;">${esc(worstDay[0])}</div>
</div>` : ""}

<h2 class="section-title"><span class="section-title-bar"></span>Savings Rate per Bulan</h2>
<hr class="section-hr">
<table class="monthly-chart-table" style="height:60pt;">
  <tr>
    ${monthlyRates.map(r => {
      const h = Math.max(2, Math.abs(r.rate) / maxRate * 50)
      const color = r.rate >= 20 ? '#5b8c7a' : r.rate >= 10 ? '#d4a853' : '#c47d5a'
      return `<td style="vertical-align:bottom;"><div class="monthly-bar" style="height:${h}pt;background:${color};"></div></td>`
    }).join("")}
  </tr>
  <tr>
    ${monthlyRates.map(r => `<td class="monthly-label">${esc(r.month)}</td>`).join("")}
  </tr>
</table>

${sortedCategories.length > 0 ? `
<h2 class="section-title"><span class="section-title-bar"></span>Pengeluaran per Kategori</h2>
<hr class="section-hr">
<table class="bar-chart-table">
  ${sortedCategories.slice(0, 8).map(([cat, val], i) => {
    const maxVal = sortedCategories[0][1]
    const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0
    const colors = ["#7c8c5a","#c47d5a","#5b8c7a","#9f87ef","#d4a853","#5069cc","#c44545","#7aab9a"]
    const color = colors[i % colors.length]
    return `
  <tr>
    <td class="bar-label-cell">${esc(cat)}</td>
    <td style="width:auto;"><div class="bar-track"><div class="bar-fill" style="width:${barPct}%; background:${color};"></div></div></td>
    <td class="bar-amount-cell">${formatRpFull(val)}</td>
  </tr>`
  }).join("")}
</table>` : ""}

<h2 class="section-title"><span class="section-title-bar"></span>Fun Stats</h2>
<hr class="section-hr">
<table class="grid-table">
  <tr>
    <td width="50%" style="padding-right:5pt;">
      <div class="card">
        <div class="label">Rata-rata Harian</div>
        <div class="value" style="font-size:14pt;">${formatRpFull(avgDaily)}</div>
      </div>
    </td>
    <td width="50%" style="padding-left:5pt;">
      <div class="card">
        <div class="label">Total Transaksi</div>
        <div class="value" style="font-size:14pt;">${yearTx.length}</div>
      </div>
    </td>
  </tr>
  <tr>
    <td width="50%" style="padding-right:5pt;">
      <div class="card">
        <div class="label">Kategori Terbanyak</div>
        <div class="value" style="font-size:11pt;">${sortedCategories.length > 0 ? esc(sortedCategories[0][0]) : "—"}</div>
      </div>
    </td>
    <td width="50%" style="padding-left:5pt;">
      <div class="card">
        <div class="label">Bulan Aktif</div>
        <div class="value" style="font-size:14pt;">${yearMonthly.length}</div>
      </div>
    </td>
  </tr>
</table>

<hr class="footer-hr">
<div class="footer">
  Dibuat otomatis oleh Artoku &mdash; ${timestamp}
</div>
</div><!-- /.content -->
<div class="footer-stripe"></div>

</body>
</html>`
}
