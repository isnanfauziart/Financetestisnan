import { jsPDF } from "jspdf"
import { AVAILABLE_MONTHS } from "@/app/dashboard/_components/constants"

const C = {
  violet: [124, 95, 207],
  teal: [91, 140, 122],
  sage: [124, 140, 90],
  terracotta: [196, 125, 90],
  dark: [42, 32, 24],
  medium: [107, 91, 79],
  light: [156, 137, 120],
  border: [237, 224, 208],
  surface: [246, 239, 229],
  bg: [248, 244, 238],
  white: [255, 255, 255],
  red: [196, 69, 69],
  gold: [212, 168, 83],
  lightViolet: [243, 239, 252],
  lightTeal: [235, 243, 240],
  lightSage: [244, 246, 236],
  lightTerracotta: [251, 240, 233],
  lightGold: [253, 247, 232],
  lightRed: [251, 236, 236],
}

const BAR_COLORS = [
  [124, 140, 90], [196, 125, 90], [91, 140, 122], [159, 135, 239],
  [212, 168, 83], [80, 105, 204], [196, 69, 69], [122, 171, 154],
]

const M = { left: 15, right: 15, top: 15 }
const PW = 210
const CW = PW - M.left - M.right

function fmtRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID")
}

function prevMonth(month, year) {
  const idx = AVAILABLE_MONTHS.indexOf(month)
  if (idx <= 0) return { month: AVAILABLE_MONTHS[11], year: String(Number(year) - 1) }
  return { month: AVAILABLE_MONTHS[idx - 1], year }
}

class PdfBuilder {
  constructor() {
    this.doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })
    this.y = M.top
    this.pageNum = 1
  }

  checkPage(needed) {
    if (this.y + needed > 282) {
      this.doc.addPage()
      this.pageNum++
      this.y = M.top
    }
  }

  stripe(h, colors) {
    const seg = CW / colors.length
    for (let i = 0; i < colors.length; i++) {
      this.doc.setFillColor(...colors[i])
      this.doc.rect(M.left + seg * i, this.y, seg + 0.5, h, "F")
    }
    this.y += h
  }

  line(y, color = C.border, width = 0.3) {
    this.doc.setDrawColor(...color)
    this.doc.setLineWidth(width)
    this.doc.line(M.left, y, PW - M.right, y)
  }

  text(str, x, y, opts = {}) {
    const { size = 10, color = C.dark, align = "left", style = "normal", maxWidth } = opts
    this.doc.setFontSize(size)
    this.doc.setFont("Helvetica", style)
    this.doc.setTextColor(...color)
    const textOpts = {}
    if (align === "center") textOpts.align = "center"
    if (align === "right") textOpts.align = "right"
    if (maxWidth) {
      const lines = this.doc.splitTextToSize(String(str), maxWidth)
      this.doc.text(lines, x, y, textOpts)
      return lines.length * (size * 0.35)
    }
    this.doc.text(String(str), x, y, textOpts)
    return size * 0.35
  }

  sectionHeader(title) {
    this.checkPage(18)
    this.y += 6
    this.doc.setFillColor(...C.violet)
    this.doc.rect(M.left, this.y, 2, 5, "F")
    this.text(title, M.left + 4, this.y + 4, { size: 10, color: C.medium, style: "bold" })
    this.line(this.y + 7, C.border, 0.2)
    this.y += 10
  }

  drawSummaryCards(data) {
    const cardW = (CW - 4) / 2
    const cardH = 20
    const pad = 4

    for (let row = 0; row < data.length; row++) {
      this.checkPage(cardH + 4)
      for (let col = 0; col < 2; col++) {
        const idx = row * 2 + col
        if (idx >= data.length) break
        const d = data[idx]
        const x = M.left + col * (cardW + 4)
        const y = this.y

        this.doc.setFillColor(...d.bg)
        this.doc.setDrawColor(...C.border)
        this.doc.setLineWidth(0.2)
        this.doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD")

        this.doc.setFillColor(...d.accent)
        this.doc.rect(x, y, 2, cardH, "F")

        this.text(d.label, x + 5, y + 6, { size: 6.5, color: C.light, style: "bold" })
        this.text(d.value, x + 5, y + 14, { size: 12, color: d.valueColor || C.dark, style: "bold" })
      }
      this.y += cardH + 3
    }
  }

  drawBarChart(categories, totalExpense) {
    const maxVal = categories.length > 0 ? categories[0][1] : 1
    const barH = 5
    const rowH = 8
    const labelW = 35
    const amountW = 25
    const barW = CW - labelW - amountW - 4

    for (let i = 0; i < Math.min(categories.length, 8); i++) {
      this.checkPage(rowH)
      const [cat, val] = categories[i]
      const pct = maxVal > 0 ? val / maxVal : 0
      const color = BAR_COLORS[i % BAR_COLORS.length]
      const y = this.y

      this.text(cat, M.left + labelW - 2, y + 4.5, { size: 7, color: C.dark, align: "right" })

      this.doc.setFillColor(...C.surface)
      this.doc.roundedRect(M.left + labelW, y, barW, barH, 1, 1, "F")
      this.doc.setFillColor(...color)
      if (pct > 0) {
        const fillW = Math.max(barW * pct, 1)
        this.doc.roundedRect(M.left + labelW, y, fillW, barH, 1, 1, "F")
      }

      this.text(fmtRp(val), M.left + labelW + barW + 2, y + 4.5, { size: 7, color: C.medium, align: "left" })
      this.y += rowH
    }
  }

  drawTable(headers, rows, colWidths) {
    const th = 6
    const td = 6

    this.checkPage(th + td)
    this.doc.setFillColor(...C.surface)
    this.doc.rect(M.left, this.y, CW, th, "F")
    let x = M.left
    for (let i = 0; i < headers.length; i++) {
      const align = i > 0 && i === headers.length - 1 ? "right" : (i > 0 ? "right" : "left")
      this.text(headers[i], x + (align === "right" ? colWidths[i] - 2 : 2), this.y + 4.5, {
        size: 7, color: C.medium, style: "bold", align
      })
      x += colWidths[i]
    }
    this.y += th
    this.line(this.y, C.border, 0.3)
    this.y += 1

    for (const row of rows) {
      this.checkPage(td + 1)
      x = M.left
      for (let i = 0; i < row.length; i++) {
        const cell = row[i]
        const align = i > 0 && i === row.length - 1 ? "right" : (i > 0 ? "right" : "left")
        const color = typeof cell === "object" ? cell.color : C.dark
        const val = typeof cell === "object" ? cell.text : cell
        this.text(val, x + (align === "right" ? colWidths[i] - 2 : 2), this.y + 4, {
          size: 7.5, color, align
        })
        x += colWidths[i]
      }
      this.y += td
      this.line(this.y, C.surface, 0.15)
      this.y += 0.5
    }
    this.y += 3
  }

  drawBudgetTable(budgetRows) {
    const headers = ["Kategori", "Terpakai", "Progres", "Limit", "%", "Status"]
    const colWidths = [40, 28, 38, 28, 15, 31]
    const th = 6
    const td = 8

    this.checkPage(th + td)
    this.doc.setFillColor(...C.surface)
    this.doc.rect(M.left, this.y, CW, th, "F")
    let x = M.left
    for (let i = 0; i < headers.length; i++) {
      const align = i === 0 ? "left" : (i === 2 ? "center" : "right")
      this.text(headers[i], x + (align === "right" ? colWidths[i] - 2 : (align === "center" ? colWidths[i] / 2 : 2)), this.y + 4.5, {
        size: 7, color: C.medium, style: "bold", align
      })
      x += colWidths[i]
    }
    this.y += th
    this.line(this.y, C.border, 0.3)
    this.y += 1

    for (const b of budgetRows) {
      this.checkPage(td + 1)
      x = M.left
      const usedPct = b.usedPct
      const barColor = usedPct >= 100 ? C.red : usedPct >= 70 ? C.gold : C.teal
      const badgeBg = usedPct >= 100 ? C.lightRed : usedPct >= 70 ? C.lightGold : C.lightTeal
      const badgeColor = usedPct >= 100 ? C.red : usedPct >= 70 ? C.gold : C.teal

      this.text(b.kategori, x + 2, this.y + 4.5, { size: 7.5, color: C.dark })
      x += colWidths[0]

      this.text(fmtRp(b.spent), x + colWidths[1] - 2, this.y + 4.5, { size: 7.5, color: C.dark, align: "right" })
      x += colWidths[1]

      const barX = x + 4
      const barW = colWidths[2] - 8
      const barH = 3
      const barY = this.y + 2.5
      this.doc.setFillColor(...C.surface)
      this.doc.roundedRect(barX, barY, barW, barH, 1, 1, "F")
      this.doc.setFillColor(...barColor)
      const fillW = Math.min(barW * (usedPct / 100), barW)
      if (fillW > 0) this.doc.roundedRect(barX, barY, fillW, barH, 1, 1, "F")
      x += colWidths[2]

      this.text(fmtRp(b.limit), x + colWidths[3] - 2, this.y + 4.5, { size: 7.5, color: C.dark, align: "right" })
      x += colWidths[3]

      this.text(usedPct.toFixed(0) + "%", x + colWidths[4] - 2, this.y + 4.5, { size: 7.5, color: C.dark, align: "right" })
      x += colWidths[4]

      this.doc.setFillColor(...badgeBg)
      const badgeW = 18
      this.doc.roundedRect(x + 5, this.y + 1.5, badgeW, 5, 1, 1, "F")
      this.text(b.status, x + 5 + badgeW / 2, this.y + 5, { size: 6.5, color: badgeColor, style: "bold", align: "center" })

      this.y += td
      this.line(this.y, C.surface, 0.15)
      this.y += 0.5
    }
    this.y += 3
  }

  drawComparisonCards(data, prevMonthName, curMonthName) {
    const cardW = (CW - 8) / 3
    const cardH = 32

    this.checkPage(cardH + 4)

    for (let i = 0; i < data.length; i++) {
      const d = data[i]
      const x = M.left + i * (cardW + 4)
      const y = this.y

      this.doc.setFillColor(...C.white)
      this.doc.setDrawColor(...C.border)
      this.doc.setLineWidth(0.2)
      this.doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD")

      this.doc.setFillColor(...d.accent)
      this.doc.rect(x, y, 2, cardH, "F")

      this.text(d.label, x + 5, y + 6, { size: 6.5, color: C.light, style: "bold" })

      const maxVal = Math.max(Math.abs(d.prevVal), Math.abs(d.curVal), 1)
      const barMaxH = 14
      const barW = (cardW - 16) / 2

      const prevH = Math.max((Math.abs(d.prevVal) / maxVal) * barMaxH, 1)
      const curH = Math.max((Math.abs(d.curVal) / maxVal) * barMaxH, 1)

      const barY = y + 9 + barMaxH

      this.doc.setFillColor(...d.prevColor)
      this.doc.roundedRect(x + 5, barY - prevH, barW, prevH, 0.5, 0.5, "F")
      this.text(prevMonthName, x + 5 + barW / 2, barY + 3, { size: 5.5, color: C.light, align: "center" })
      this.text(fmtRp(d.prevVal), x + 5 + barW / 2, barY + 6.5, { size: 5.5, color: C.medium, align: "center" })

      this.doc.setFillColor(...d.curColor)
      this.doc.roundedRect(x + 10 + barW, barY - curH, barW, curH, 0.5, 0.5, "F")
      this.text(curMonthName, x + 10 + barW + barW / 2, barY + 3, { size: 5.5, color: C.light, align: "center" })
      this.text(fmtRp(d.curVal), x + 10 + barW + barW / 2, barY + 6.5, { size: 5.5, color: C.medium, align: "center" })
    }
    this.y += cardH + 4
  }

  footer(timestamp) {
    this.checkPage(16)
    this.y += 4
    this.line(this.y, C.border, 0.3)
    this.y += 5
    this.text("Dibuat otomatis oleh Artami \u2014 " + timestamp, PW / 2, this.y, {
      size: 7, color: C.light, align: "center"
    })
    this.y += 4
    this.stripe(2, [C.violet, C.teal, C.sage])
  }
}

export function generateReportPDF({
  month, year, transactions, budgets, allTransactions, monthlyData, healthScore,
}) {
  const b = new PdfBuilder()
  const doc = b.doc

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const savings = transactions.filter(t => t.type === "savings").reduce((s, t) => s + t.amount, 0)
  const surplus = income - expense
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0

  const expenseByCategory = {}
  for (const t of transactions) {
    if (t.type !== "expense") continue
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  }
  const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])

  const top10 = transactions.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 10)

  const prev = prevMonth(month, year)
  const prevTx = (monthlyData || []).find(m => m.month === prev.month && String(m.year || "") === prev.year)
  const prevIncome = prevTx ? prevTx.pemasukan : 0
  const prevExpense = prevTx ? prevTx.pengeluaran : 0
  const prevSurplus = prevIncome - prevExpense

  const budgetRows = (budgets || []).map(bk => {
    const spent = expenseByCategory[bk.kategori] || 0
    const limit = bk.limit || 0
    const usedPct = limit > 0 ? (spent / limit) * 100 : 0
    const status = usedPct >= 100 ? "Over" : usedPct >= 90 ? "Hampir" : usedPct >= 70 ? "Warning" : "Sehat"
    return { ...bk, spent, usedPct, status }
  })

  const timestamp = new Date().toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  })

  b.stripe(3, [C.violet, C.teal, C.sage])

  b.y += 6
  b.text("LAPORAN KEUANGAN BULANAN", PW / 2, b.y, { size: 18, color: C.dark, style: "bold", align: "center" })
  b.y += 7
  b.text(month + " " + year + " \u2014 Artami", PW / 2, b.y, { size: 10, color: C.medium, align: "center" })
  b.y += 5
  b.line(b.y, C.border, 0.4)
  b.y += 2

  if (healthScore) {
    b.y += 4
    const badgeSize = 16
    const bx = PW / 2 - badgeSize / 2
    const borderColor = healthScore.gradeColor === "#5b8c7a" ? C.teal
      : healthScore.gradeColor === "#d4a853" ? C.gold
      : healthScore.gradeColor === "#c44545" ? C.red : C.medium
    doc.setDrawColor(...borderColor)
    doc.setLineWidth(0.8)
    doc.setFillColor(...C.white)
    doc.circle(PW / 2, b.y + badgeSize / 2, badgeSize / 2, "FD")
    b.text(healthScore.grade, PW / 2, b.y + badgeSize / 2 + 2, {
      size: 16, color: borderColor, style: "bold", align: "center"
    })
    b.y += badgeSize + 2
    b.text("Skor Kesehatan Keuangan: " + healthScore.score, PW / 2, b.y, {
      size: 8, color: C.medium, align: "center"
    })
    b.y += 4
  }

  b.sectionHeader("RINGKASAN")
  b.drawSummaryCards([
    { label: "Total Pemasukan", value: fmtRp(income), accent: C.sage, bg: C.lightSage, valueColor: C.teal },
    { label: "Total Pengeluaran", value: fmtRp(expense), accent: C.terracotta, bg: C.lightTerracotta, valueColor: C.terracotta },
    { label: "Total Tabungan", value: fmtRp(savings), accent: C.teal, bg: C.lightTeal, valueColor: C.teal },
    { label: "Surplus", value: fmtRp(surplus), accent: surplus >= 0 ? C.teal : C.terracotta, bg: surplus >= 0 ? C.lightTeal : C.lightTerracotta, valueColor: surplus >= 0 ? C.teal : C.terracotta },
    { label: "Savings Rate", value: savingsRate.toFixed(1) + "%", accent: C.violet, bg: C.lightViolet },
    { label: "Jumlah Transaksi", value: String(transactions.length), accent: C.light, bg: C.surface },
  ])

  if (sortedCategories.length > 0) {
    b.sectionHeader("PENGELUARAN PER KATEGORI")
    b.drawBarChart(sortedCategories, expense)

    const tableRows = sortedCategories.map(([cat, val]) => [
      cat,
      fmtRp(val),
      { text: ((val / expense) * 100).toFixed(1) + "%", color: C.medium },
    ])
    b.drawTable(["Kategori", "Jumlah", "% Total"], tableRows, [80, 55, 45])
  }

  if (budgetRows.length > 0) {
    b.sectionHeader("ANGGARAN VS REALISASI")
    b.drawBudgetTable(budgetRows)
  }

  if (top10.length > 0) {
    b.sectionHeader("TOP 10 TRANSAKSI TERBESAR")
    const rows = top10.map((t, i) => [
      String(i + 1),
      t.category,
      t.desc || "\u2014",
      t.date || "",
      { text: "-" + fmtRp(t.amount), color: C.terracotta },
    ])
    b.drawTable(["#", "Kategori", "Keterangan", "Tanggal", "Jumlah"], rows, [8, 38, 52, 35, 47])
  }

  if (prevTx) {
    b.sectionHeader("PERBANDINGAN BULAN LALU (" + prev.month.toUpperCase() + ")")
    b.drawComparisonCards([
      {
        label: "Pemasukan", prevVal: prevIncome, curVal: income,
        accent: C.sage, prevColor: [180, 192, 158], curColor: C.sage,
      },
      {
        label: "Pengeluaran", prevVal: prevExpense, curVal: expense,
        accent: C.terracotta, prevColor: [218, 180, 160], curColor: C.terracotta,
      },
      {
        label: "Surplus", prevVal: prevSurplus, curVal: surplus,
        accent: surplus >= 0 ? C.teal : C.terracotta,
        prevColor: prevSurplus >= 0 ? [180, 200, 190] : [218, 180, 160],
        curColor: surplus >= 0 ? C.teal : C.terracotta,
      },
    ], prev.month, month)

    const deltaText = (cur, prev) => {
      if (!prev) return "0%"
      const d = ((cur - prev) / prev) * 100
      return (d >= 0 ? "+" : "") + d.toFixed(0) + "%"
    }
    b.drawTable(
      ["Metrik", prev.month + " " + prev.year, month + " " + year, "Perubahan"],
      [
        ["Pemasukan", fmtRp(prevIncome), fmtRp(income), { text: deltaText(income, prevIncome), color: income >= prevIncome ? C.teal : C.terracotta }],
        ["Pengeluaran", fmtRp(prevExpense), fmtRp(expense), { text: deltaText(expense, prevExpense), color: expense <= prevExpense ? C.teal : C.terracotta }],
        ["Surplus", fmtRp(prevSurplus), fmtRp(surplus), { text: fmtRp(Math.abs(surplus - prevSurplus)), color: surplus >= prevSurplus ? C.teal : C.terracotta }],
      ],
      [40, 45, 45, 50],
    )
  }

  b.footer(timestamp)

  doc.save("Laporan-Keuangan-" + month + "-" + year + ".pdf")
}
