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

  /* Header stripe */
  .header-stripe {
    height: 5pt;
    background: linear-gradient(135deg, #7c5fcf 0%, #5b8c7a 50%, #7c8c5a 100%);
  }
  .header-area {
    position: relative;
    text-align: center;
    padding: 28pt 24pt 18pt;
    background:
      repeating-linear-gradient(
        135deg,
        transparent,
        transparent 18pt,
        rgba(124,95,207,0.03) 18pt,
        rgba(124,95,207,0.03) 19pt
      );
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
    background: linear-gradient(90deg, transparent 0%, #ede0d0 20%, #ede0d0 80%, transparent 100%);
    margin: 0 24pt;
  }

  .content { padding: 18pt 24pt 24pt; }

  h2 {
    font-size: 11pt;
    font-weight: 700;
    color: #4a3d33;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    display: flex;
    align-items: center;
    gap: 6pt;
    margin-top: 20pt;
    margin-bottom: 10pt;
  }
  h2::before {
    content: '';
    display: inline-block;
    width: 3pt;
    height: 14pt;
    border-radius: 2pt;
    background: linear-gradient(180deg, #7c5fcf, #5b8c7a);
    flex-shrink: 0;
  }
  h2::after {
    content: '';
    flex: 1;
    height: 1pt;
    background: linear-gradient(90deg, #ede0d0 0%, transparent 100%);
    margin-left: 6pt;
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
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  .positive { color: #5b8c7a; }
  .negative { color: #c47d5a; }
  .danger { color: #c44545; }

  /* Health Score Badge */
  .health-section {
    text-align: center;
    margin: 14pt 0 6pt;
  }
  .health-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52pt;
    height: 52pt;
    border-radius: 50%;
    border: 3.5pt solid;
    position: relative;
  }
  .health-badge .grade-letter {
    font-size: 22pt;
    font-weight: 800;
    line-height: 1;
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

  /* Summary Cards */
  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8pt;
    margin-bottom: 14pt;
  }
  .summary-item {
    border: 1pt solid #ede0d0;
    border-radius: 8pt;
    padding: 10pt 12pt;
    display: flex;
    align-items: flex-start;
    gap: 10pt;
  }
  .summary-icon {
    width: 28pt;
    height: 28pt;
    border-radius: 7pt;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .summary-text { flex: 1; min-width: 0; }
  .summary-label {
    font-size: 7.5pt;
    font-weight: 700;
    color: #9c8978;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 1pt;
  }
  .summary-value {
    font-size: 14pt;
    font-weight: 700;
    color: #2a2018;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  /* Bar Chart */
  .bar-chart { margin-bottom: 14pt; }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 8pt;
    margin-bottom: 5pt;
  }
  .bar-label {
    font-size: 8.5pt;
    color: #4a3d33;
    width: 110pt;
    text-align: right;
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar-track {
    flex: 1;
    height: 14pt;
    background: #f6efe5;
    border-radius: 3pt;
    overflow: hidden;
    position: relative;
  }
  .bar-fill {
    height: 100%;
    border-radius: 3pt;
    min-width: 2pt;
    transition: width 0.3s;
  }
  .bar-amount {
    font-size: 8pt;
    color: #6b5b4f;
    width: 70pt;
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  /* Budget Progress */
  .budget-progress-cell {
    width: 80pt;
    padding: 4pt 6pt;
  }
  .budget-bar-track {
    height: 7pt;
    background: #f6efe5;
    border-radius: 3pt;
    overflow: hidden;
  }
  .budget-bar-fill {
    height: 100%;
    border-radius: 3pt;
    min-width: 2pt;
  }

  /* Comparison Bars */
  .compare-bars {
    display: flex;
    gap: 2pt;
    align-items: flex-end;
    height: 18pt;
    width: 60pt;
    flex-shrink: 0;
  }
  .compare-bar {
    flex: 1;
    border-radius: 2pt 2pt 0 0;
    min-height: 2pt;
  }

  /* Badges */
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

  /* Footer */
  .footer {
    margin-top: 20pt;
    padding: 10pt 24pt 14pt;
    border-top: none;
    font-size: 8pt;
    color: #9c8978;
    text-align: center;
    position: relative;
  }
  .footer::before {
    content: '';
    display: block;
    height: 1.5pt;
    background: linear-gradient(90deg, transparent 0%, #ede0d0 20%, #ede0d0 80%, transparent 100%);
    margin-bottom: 10pt;
  }
  .footer-stripe {
    height: 3pt;
    background: linear-gradient(135deg, #7c5fcf 0%, #5b8c7a 50%, #7c8c5a 100%);
    margin-top: 10pt;
    border-radius: 0 0 2pt 2pt;
  }
  .delta-positive { color: #5b8c7a; font-size: 9pt; font-weight: 600; }
  .delta-negative { color: #c47d5a; font-size: 9pt; font-weight: 600; }

  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    .summary-item { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    .header-stripe { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bar-fill, .budget-bar-fill, .compare-bar, .summary-icon, .health-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
  <div class="health-badge" style="border-color:${esc(healthScore.gradeColor || '#6b5b4f')};">
    <span class="grade-letter" style="color:${esc(healthScore.gradeColor || '#2a2018')};">${esc(healthScore.grade)}</span>
  </div>
  <div class="health-meta">Skor Kesehatan Keuangan: <span class="score-num">${healthScore.score}</span></div>
</div>
` : ""}

<h2>Ringkasan</h2>
<div class="summary-grid">
  <div class="summary-item" style="border-left:3pt solid #7c8c5a; background:linear-gradient(135deg, #f4f6ec 0%, #ffffff 100%);">
    <div class="summary-icon" style="background:#f4f6ec;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c8c5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    </div>
    <div class="summary-text">
      <div class="summary-label">Total Pemasukan</div>
      <div class="summary-value positive">${formatRpFull(income)}</div>
    </div>
  </div>
  <div class="summary-item" style="border-left:3pt solid #c47d5a; background:linear-gradient(135deg, #fbf0e9 0%, #ffffff 100%);">
    <div class="summary-icon" style="background:#fbf0e9;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c47d5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
    </div>
    <div class="summary-text">
      <div class="summary-label">Total Pengeluaran</div>
      <div class="summary-value negative">${formatRpFull(expense)}</div>
    </div>
  </div>
  <div class="summary-item" style="border-left:3pt solid #5b8c7a; background:linear-gradient(135deg, #ebf3f0 0%, #ffffff 100%);">
    <div class="summary-icon" style="background:#ebf3f0;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b8c7a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-0.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/></svg>
    </div>
    <div class="summary-text">
      <div class="summary-label">Total Tabungan</div>
      <div class="summary-value">${formatRpFull(savings)}</div>
    </div>
  </div>
  <div class="summary-item" style="border-left:3pt solid ${surplus >= 0 ? '#5b8c7a' : '#c47d5a'}; background:linear-gradient(135deg, ${surplus >= 0 ? '#ebf3f0' : '#fbf0e9'} 0%, #ffffff 100%);">
    <div class="summary-icon" style="background:${surplus >= 0 ? '#ebf3f0' : '#fbf0e9'};">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${surplus >= 0 ? '#5b8c7a' : '#c47d5a'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V8M5 12H2l10-10 10 10h-3"/></svg>
    </div>
    <div class="summary-text">
      <div class="summary-label">Surplus</div>
      <div class="summary-value ${surplus >= 0 ? 'positive' : 'negative'}">${formatRpFull(surplus)}</div>
    </div>
  </div>
  <div class="summary-item" style="border-left:3pt solid #7c5fcf; background:linear-gradient(135deg, #f3effc 0%, #ffffff 100%);">
    <div class="summary-icon" style="background:#f3effc;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c5fcf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </div>
    <div class="summary-text">
      <div class="summary-label">Savings Rate</div>
      <div class="summary-value">${savingsRate.toFixed(1)}%</div>
    </div>
  </div>
  <div class="summary-item" style="border-left:3pt solid #9c8978; background:linear-gradient(135deg, #f6efe5 0%, #ffffff 100%);">
    <div class="summary-icon" style="background:#f6efe5;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9c8978" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8M12 17v4"/></svg>
    </div>
    <div class="summary-text">
      <div class="summary-label">Jumlah Transaksi</div>
      <div class="summary-value">${transactions.length}</div>
    </div>
  </div>
</div>

${sortedCategories.length > 0 ? `
<h2>Pengeluaran per Kategori</h2>
<div class="bar-chart">
  ${sortedCategories.slice(0, 8).map(([cat, val], i) => {
    const maxVal = sortedCategories[0][1]
    const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0
    const colors = ["#7c8c5a","#c47d5a","#5b8c7a","#9f87ef","#d4a853","#5069cc","#c44545","#7aab9a"]
    const color = colors[i % colors.length]
    return `
  <div class="bar-row">
    <div class="bar-label">${esc(cat)}</div>
    <div class="bar-track">
      <div class="bar-fill" style="width:${barPct}%; background:${color};"></div>
    </div>
    <div class="bar-amount">${formatRpFull(val)}</div>
  </div>`
  }).join("")}
</div>
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
<div class="summary-grid" style="margin-bottom:10pt;">
  ${(() => {
    const maxInc = Math.max(income, prevIncome) || 1
    const maxExp = Math.max(expense, prevExpense) || 1
    const maxSur = Math.max(Math.abs(surplus), Math.abs(prevSurplus)) || 1
    return `
  <div class="summary-item" style="border-left:3pt solid #7c8c5a;">
    <div class="summary-text">
      <div class="summary-label">Pemasukan</div>
      <div style="display:flex;align-items:flex-end;gap:4pt;margin-top:3pt;">
        <div style="flex:1;">
          <div style="font-size:7pt;color:#9c8978;margin-bottom:1pt;">${esc(prev.month)}</div>
          <div style="height:${(prevIncome / maxInc) * 28}pt;background:#7c8c5a33;border-radius:2pt;min-height:2pt;"></div>
          <div style="font-size:7pt;color:#6b5b4f;margin-top:1pt;">${formatRpFull(prevIncome)}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:7pt;color:#9c8978;margin-bottom:1pt;">${esc(month)}</div>
          <div style="height:${(income / maxInc) * 28}pt;background:#7c8c5a;border-radius:2pt;min-height:2pt;"></div>
          <div style="font-size:7pt;color:#6b5b4f;margin-top:1pt;">${formatRpFull(income)}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="summary-item" style="border-left:3pt solid #c47d5a;">
    <div class="summary-text">
      <div class="summary-label">Pengeluaran</div>
      <div style="display:flex;align-items:flex-end;gap:4pt;margin-top:3pt;">
        <div style="flex:1;">
          <div style="font-size:7pt;color:#9c8978;margin-bottom:1pt;">${esc(prev.month)}</div>
          <div style="height:${(prevExpense / maxExp) * 28}pt;background:#c47d5a33;border-radius:2pt;min-height:2pt;"></div>
          <div style="font-size:7pt;color:#6b5b4f;margin-top:1pt;">${formatRpFull(prevExpense)}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:7pt;color:#9c8978;margin-bottom:1pt;">${esc(month)}</div>
          <div style="height:${(expense / maxExp) * 28}pt;background:#c47d5a;border-radius:2pt;min-height:2pt;"></div>
          <div style="font-size:7pt;color:#6b5b4f;margin-top:1pt;">${formatRpFull(expense)}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="summary-item" style="border-left:3pt solid ${surplus >= 0 ? '#5b8c7a' : '#c47d5a'};">
    <div class="summary-text">
      <div class="summary-label">Surplus</div>
      <div style="display:flex;align-items:flex-end;gap:4pt;margin-top:3pt;">
        <div style="flex:1;">
          <div style="font-size:7pt;color:#9c8978;margin-bottom:1pt;">${esc(prev.month)}</div>
          <div style="height:${(Math.abs(prevSurplus) / maxSur) * 28}pt;background:${prevSurplus >= 0 ? '#5b8c7a33' : '#c47d5a33'};border-radius:2pt;min-height:2pt;"></div>
          <div style="font-size:7pt;color:#6b5b4f;margin-top:1pt;">${formatRpFull(prevSurplus)}</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:7pt;color:#9c8978;margin-bottom:1pt;">${esc(month)}</div>
          <div style="height:${(Math.abs(surplus) / maxSur) * 28}pt;background:${surplus >= 0 ? '#5b8c7a' : '#c47d5a'};border-radius:2pt;min-height:2pt;"></div>
          <div style="font-size:7pt;color:#6b5b4f;margin-top:1pt;">${formatRpFull(surplus)}</div>
        </div>
      </div>
    </div>
  </div>`
  })()}
</div>
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
  Dibuat otomatis oleh Artoku &mdash; ${timestamp}
</div>
</div><!-- /.content -->
<div class="footer-stripe"></div>

</body>
</html>`
}
