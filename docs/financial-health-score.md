# Skor Kesehatan Keuangan — Formula & Spesifikasi

## 1. Validasi Formula

### Komponen & Bobot

| # | Komponen | Bobot | Status | Catatan |
|---|----------|-------|--------|---------|
| 1 | Savings Rate | 30% | ✅ Tepat | Metrik paling actionable — user bisa langsung kendalikan |
| 2 | Emergency Fund | 25% | ✅ Tepat | Safety net kritis, 25% proporsional |
| 3 | Budget Adherence | 20% | ✅ Tepat | Mengukur disiplin pengeluaran |
| 4 | Goal Progress | 15% | ✅ Tepat | Forward-looking, tapi kurang kontrollable jangka pendek |
| 5 | Income Stability | 10% | ⚠️ Perlu penyesuaian | Kurang actionable — user sulit ubah stabilitas income |

### Masalah yang Ditemukan

1. **Savings Rate < 0% → score 30 terlalu murah.** Jika user defisit (pengeluaran > pemasukan), score harus 0, bukan 30. Defisit = alarm merah.

2. **Income Stability tidak actionable.** User dengan salary tetap selalu dapat 100. User freelance/insentif-heavy selalu dapat rendah. Ini bukan sesuatu yang bisa "diperbaiki". Pertimbangkan ganti dengan **Net Worth Growth** (lebih actionable).

3. **Emergency Fund "average monthly expense"** — perlu definisi: rata-rata 3 bulan terakhir? 6 bulan? Semua data?

4. **Budget Adherence** — jika user punya budget di 3 dari 18 kategori, apakah hanya 3 itu yang dihitung? Ya, harusnya hanya kategori yang ada budget-nya.

5. **Goal Progress** — jika goal sudah 100%, apakah masih dihitung? Ya, cap di 100% per goal agar tidak distorsi.

### Rekomendasi Perubahan

**Tetap gunakan 5 komponen, tapi ganti Income Stability dengan Net Worth Growth:**

| # | Komponen | Bobot | Alasan |
|---|----------|-------|--------|
| 1 | Savings Rate | 30% | Paling actionable |
| 2 | Emergency Fund | 25% | Safety net kritis |
| 3 | Budget Adherence | 20% | Disiplin pengeluaran |
| 4 | Goal Progress | 15% | Motivasi & forward-looking |
| 5 | Net Worth Growth | 10% | Lebih actionable daripada Income Stability |

**Jika tetap ingin Income Stability**, gunakan formula ini (lihat bagian 2).

---

## 2. Formula Lengkap — Presisi Matematis

### Asumsi Data
- `monthlyData`: array bulanan dari `/api/dashboard` — `{ month, pemasukan, pengeluaran, surplus, tabungan }`
- `transactions`: array transaksi dari `/api/dashboard` — `{ type, category, amount, month, year }`
- `budgets`: array budget dari `/api/budgets` — `{ kategori, bulan, tahun, limit }`
- `goals`: array goal dari `/api/goals` — `{ id, nama, target, kategori, createdAt }`
- `goalProgress`: map `{ [goalId]: amount }` dari `computeAllGoalProgress()`
- Filter: `selectedMonth`, `selectedYear`, `selectedAccount`

---

### Komponen 1: Savings Rate (30%)

**Raw metric:**
```
savingsRate = (totalIncome - totalExpense) / totalIncome × 100
```

**Score mapping:**
```javascript
function scoreSavingsRate(totalIncome, totalExpense) {
  if (totalIncome <= 0) return 0
  
  const rate = ((totalIncome - totalExpense) / totalIncome) * 100
  
  if (rate >= 20) return 100
  if (rate >= 10) return 50 + ((rate - 10) / 10) * 50  // linear 50→100
  if (rate >= 0)  return (rate / 10) * 50               // linear 0→50
  return 0  // defisit = 0
}
```

**Breakpoints:**
| Rate | Score | Interpretasi |
|------|-------|--------------|
| ≥ 20% | 100 | Excellent — menabung ≥ 1/5 pemasukan |
| 15% | 75 | Good |
| 10% | 50 | Cukup — minimum yang disarankan |
| 5% | 25 | Kurang |
| 0% | 0 | Tidak menabung |
| < 0% | 0 | Defisit — bahaya |

---

### Komponen 2: Emergency Fund (25%)

**Raw metric:**
```
emergencyMonths = (tabunganCash + tabunganEmas) / avgMonthlyExpense
```

**Avg monthly expense definition:** Rata-rata pengeluaran dari SEMUA bulan yang ada data (bukan hanya bulan terpilih). Ini memberikan gambaran kebutuhan bulanan yang realistis.

```javascript
function scoreEmergencyFund(transactions, monthlyData) {
  // Hitung total Tabungan Cash + Emas
  const liquidSavings = transactions
    .filter(t => t.type === "savings" && 
      (t.category === "Tabungan Cash" || t.category === "Emas"))
    .reduce((sum, t) => sum + t.amount, 0)
  
  // Hitung rata-rata pengeluaran bulanan
  const monthsWithExpense = monthlyData.filter(m => m.pengeluaran > 0)
  if (monthsWithExpense.length === 0) return 100  // tidak ada pengeluaran = tidak butuh emergency fund
  
  const avgMonthlyExpense = monthsWithExpense.reduce((s, m) => s + m.pengeluaran, 0) 
    / monthsWithExpense.length
  
  if (avgMonthlyExpense <= 0) return 100
  
  const months = liquidSavings / avgMonthlyExpense
  
  if (months >= 6) return 100
  return (months / 6) * 100  // linear 0→6 bulan → 0→100
}
```

**Breakpoints:**
| Months | Score | Interpretasi |
|--------|-------|--------------|
| ≥ 6 | 100 | Target tercapai — aman |
| 3 | 50 | Setengah jalan |
| 1 | 16.7 | Sangat kurang |
| 0 | 0 | Tidak ada dana darurat |

---

### Komponen 3: Budget Adherence (20%)

**Raw metric:**
```
budgetAdherence = (kategori di bawah budget / total kategori berbudget) × 100
```

**Penting:** Hanya hitung kategori yang PUNYA budget di bulan/tahun terpilih. Kategori tanpa budget TIDAK dihitung (tidak fair menghukum user yang belum set budget untuk semua kategori).

```javascript
function scoreBudgetAdherence(budgets, transactions, selectedMonth, selectedYear, selectedAccount) {
  // Filter budget untuk bulan/tahun terpilih
  const activeBudgets = budgets.filter(b => {
    if (b.bulan !== selectedMonth && selectedMonth !== "Semua Bulan") return false
    if (b.tahun !== String(selectedYear) && selectedYear !== "Semua Tahun") return false
    // Jika filter account aktif, hanya budget tanpa account atau matching
    if (selectedAccount && selectedAccount !== "Semua Akun" && b.akun && b.akun !== selectedAccount) return false
    return true
  })
  
  if (activeBudgets.length === 0) return null  // tidak ada budget = komponen di-skip
  
  // Hitung spending per kategori
  const expenseByCategory = {}
  for (const t of transactions) {
    if (t.type !== "expense") continue
    // Filter bulan/tahun/account
    if (selectedMonth !== "Semua Bulan" && t.month !== selectedMonth) continue
    if (selectedYear !== "Semua Tahun" && t.year !== String(selectedYear)) continue
    if (selectedAccount && selectedAccount !== "Semua Akun" && t.account !== selectedAccount) continue
    
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
  }
  
  // Hitung berapa kategori yang di bawah budget
  let underLimit = 0
  for (const budget of activeBudgets) {
    const spent = expenseByCategory[budget.kategori] || 0
    if (spent <= budget.limit) underLimit++
  }
  
  return (underLimit / activeBudgets.length) * 100
}
```

**Breakpoints:**
| % Under Budget | Score | Interpretasi |
|----------------|-------|--------------|
| 100% | 100 | Semua kategori patuh budget |
| 75% | 75 | Sebagian besar patuh |
| 50% | 50 | Setengah over budget |
| 25% | 25 | Mayoritas over budget |
| 0% | 0 | Semua kategori melanggar |

---

### Komponen 4: Goal Progress (15%)

**Raw metric:**
```
avgGoalProgress = average(min(progress / target × 100, 100)) untuk semua goal
```

```javascript
function scoreGoalProgress(goals, goalProgress) {
  if (!goals || goals.length === 0) return null  // tidak ada goal = komponen di-skip
  
  let totalProgress = 0
  for (const goal of goals) {
    const contributed = goalProgress[goal.id] || 0
    const pct = goal.target > 0 ? Math.min((contributed / goal.target) * 100, 100) : 100
    totalProgress += pct
  }
  
  return totalProgress / goals.length
}
```

**Breakpoints:**
| Avg Progress | Score | Interpretasi |
|--------------|-------|--------------|
| 100% | 100 | Semua goal tercapai |
| 50% | 50 | Setengah jalan |
| 0% | 0 | Belum ada kontribusi |

---

### Komponen 5a: Income Stability (10%) — Opsi A

**Raw metric:**
```
CV = stdev(monthlyIncome) / mean(monthlyIncome)
score = max(0, (1 - CV) × 100)
```

```javascript
function scoreIncomeStability(monthlyData) {
  const incomes = monthlyData
    .filter(m => m.pemasukan > 0)
    .map(m => m.pemasukan)
  
  if (incomes.length < 2) return 50  // data kurang = neutral
  
  const mean = incomes.reduce((s, v) => s + v, 0) / incomes.length
  if (mean <= 0) return 0
  
  const variance = incomes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / incomes.length
  const stdev = Math.sqrt(variance)
  const cv = stdev / mean  // coefficient of variation
  
  return Math.max(0, (1 - cv) * 100)
}
```

**Masalah:** CV > 1 → score negatif (di-cap ke 0). Tapi CV = 0.5 → score 50, yang mungkin terlalu keras untuk income bervariasi.

**Alternatif lebih baik — gunakan batas CV:**
```javascript
function scoreIncomeStabilityV2(monthlyData) {
  const incomes = monthlyData
    .filter(m => m.pemasukan > 0)
    .map(m => m.pemasukan)
  
  if (incomes.length < 2) return 50
  
  const mean = incomes.reduce((s, v) => s + v, 0) / incomes.length
  if (mean <= 0) return 0
  
  const variance = incomes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / incomes.length
  const stdev = Math.sqrt(variance)
  const cv = stdev / mean
  
  // CV ≤ 0.1 → 100 (sangat stabil)
  // CV ≥ 0.8 → 0 (sangat tidak stabil)
  // Linear di antaranya
  if (cv <= 0.1) return 100
  if (cv >= 0.8) return 0
  return ((0.8 - cv) / 0.7) * 100
}
```

---

### Komponen 5b: Net Worth Growth (10%) — Opsi B (Direkomendasikan)

**Raw metric:**
```
growthRate = (netWorthCurrent - netWorthPrevious) / |netWorthPrevious| × 100
```

```javascript
function scoreNetWorthGrowth(netWorthHistory) {
  if (netWorthHistory.length < 2) return 50  // data kurang = neutral
  
  const current = netWorthHistory[netWorthHistory.length - 1].value
  const previous = netWorthHistory[netWorthHistory.length - 2].value
  
  if (previous === 0) {
    // Jika sebelumnya 0, dan sekarang positif = bagus
    return current > 0 ? 80 : 0
  }
  
  const growthRate = ((current - previous) / Math.abs(previous)) * 100
  
  // Growth ≥ 5% → 100
  // Growth = 0% → 50
  // Growth ≤ -5% → 0
  if (growthRate >= 5) return 100
  if (growthRate <= -5) return 0
  return 50 + (growthRate / 5) * 50  // linear -5% → +5% → 0 → 100
}
```

---

## 3. Weight Redistribution (Komponen Di-skip)

Jika komponen mengembalikan `null` (tidak ada data), bobotnya didistribusikan ke komponen lain secara proporsional.

```javascript
function computeFinalScore(scores) {
  // scores: array of { score: number|null, weight: number }
  
  const activeScores = scores.filter(s => s.score !== null)
  if (activeScores.length === 0) return 0
  
  const totalActiveWeight = activeScores.reduce((s, c) => s + c.weight, 0)
  
  let finalScore = 0
  for (const s of activeScores) {
    finalScore += s.score * (s.weight / totalActiveWeight)
  }
  
  return Math.round(finalScore)
}
```

**Contoh:**
- Semua 5 komponen aktif: `30% + 25% + 20% + 15% + 10% = 100%`
- Tanpa budget (20% di-skip): Savings 30/80=37.5%, Emergency 25/80=31.25%, Goal 15/80=18.75%, Stability 10/80=12.5%
- Tanpa budget & goal (35% di-skip): Savings 30/65=46.15%, Emergency 25/65=38.46%, Stability 10/65=15.38%

---

## 4. Edge Cases — Perilaku Pasti

| Edge Case | Perilaku | Alasan |
|-----------|----------|--------|
| **< 1 bulan data** | Skor dihitung normal dengan data yang ada. Income Stability = 50 (neutral). | Tidak fair menghukum user baru |
| **Tidak ada budget** | Budget Adherence = null, bobot di-distribusi ke komponen lain | Tidak fair menghukum user yang belum set budget |
| **Tidak ada goal** | Goal Progress = null, bobot di-distribusi ke komponen lain | Tidak fair menghukum user yang belum set goal |
| **Income = 0** | Savings Rate = 0 (divisi nol) | Definisi: tidak ada pemasukan = tidak bisa menabung |
| **Semua savings = 0** | Emergency Fund = 0 bulan → score 0 | Benar — tidak ada dana darurat |
| **Emergency fund > 6 bulan** | Score = 100 (cap) | Target tercapai, tidak perlu bonus |
| **Goal progress > 100%** | Cap di 100% per goal | Tidak distorsi oleh over-contribution |
| **Pengeluaran > pemasukan (defisit)** | Savings Rate = 0 | Defisit = alarm merah |
| **Budget 0 (limit = 0)** | Jika spent > 0 = over budget | Budget 0 berarti "jangan belanja" |
| **Satu-satunya bulan punya income 0** | Income Stability = 50 (neutral) | Data kurang untuk assess |
| **Net Worth negatif** | Score tetap dihitung, growth rate menggunakan |abs(previous)| | Negatif = hutang, growth ke 0 = membaik |

---

## 5. Dokumentasi untuk Info Modal (Bahasa Indonesia)

```
┌─────────────────────────────────────────────────────┐
│  ℹ️  Cara Menghitung Skor Kesehatan Keuangan        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Skor = (A × 30%) + (B × 25%) + (C × 20%)         │
│        + (D × 15%) + (E × 10%)                     │
│                                                     │
│  ─── Komponen Skor ───                              │
│                                                     │
│  A. Tabungan Rate (30%)                             │
│     Berapa % pemasukan yang ditabung.               │
│     ≥ 20% = bagus, < 10% = perlu ditingkatkan.     │
│     Contoh: Gaji Rp 10jt, nabung Rp 2jt = 20% ✓   │
│                                                     │
│  B. Dana Darurat (25%)                              │
│     Tabungan Cash + Emas dibanding kebutuhan        │
│     6 bulan pengeluaran.                            │
│     Contoh: Dana Rp 30jt, pengeluaran Rp 5jt/bulan │
│     = 6 bulan = sempurna ✓                          │
│                                                     │
│  C. Patuh Budget (20%)                              │
│     % kategori yang pengeluarannya di bawah limit.  │
│     Contoh: 5 dari 6 kategori budget = 83% ✓       │
│                                                     │
│  D. Progress Goal (15%)                             │
│     Rata-rata progress tabungan ke target goal.     │
│     Contoh: Goal Rp 20jt, terkumpul Rp 10jt = 50%  │
│                                                     │
│  E. Stabilitas Income (10%)                         │
│     Seberapa konsisten pemasukan tiap bulan.        │
│     Variasi kecil = skor tinggi.                    │
│                                                     │
│  ─── Grade ───                                      │
│                                                     │
│  A (90+)  = Sehat sekali                            │
│  B (75-89) = Cukup sehat                            │
│  C (60-74) = Perlu perhatian                        │
│  D (40-59) = Kurang sehat                           │
│  F (< 40)  = Perlu perbaikan serius                 │
│                                                     │
│  ℹ️  Jika budget atau goal belum diatur,            │
│     komponen tersebut di-skip dan bobotnya           │
│     dibagi ke komponen lain.                        │
└─────────────────────────────────────────────────────┘
```

---

## 6. Implementasi JavaScript

```javascript
// src/lib/financialHealthScore.js

/**
 * Hitung Skor Kesehatan Keuangan
 * @param {Object} params
 * @param {Array} params.monthlyData - dari /api/dashboard
 * @param {Array} params.transactions - dari /api/dashboard
 * @param {Array} params.budgets - dari /api/budgets
 * @param {Array} params.goals - dari /api/goals
 * @param {Object} params.goalProgress - dari computeAllGoalProgress()
 * @param {Array} params.netWorthHistory - dari /api/dashboard
 * @param {string} params.selectedMonth - filter bulan
 * @param {string|number} params.selectedYear - filter tahun
 * @param {string} params.selectedAccount - filter akun
 * @returns {Object} { totalScore, grade, components[] }
 */
export function computeFinancialHealthScore({
  monthlyData = [],
  transactions = [],
  budgets = [],
  goals = [],
  goalProgress = {},
  netWorthHistory = [],
  selectedMonth = "Semua Bulan",
  selectedYear = "Semua Tahun",
  selectedAccount = "Semua Akun",
}) {
  const components = []

  // ─── Filter transactions by month/year/account ───
  const filtered = transactions.filter(t => {
    if (selectedMonth !== "Semua Bulan" && t.month !== selectedMonth) return false
    if (selectedYear !== "Semua Tahun" && t.year !== String(selectedYear)) return false
    if (selectedAccount !== "Semua Akun" && t.account !== selectedAccount) return false
    return true
  })

  const totalIncome = filtered
    .filter(t => t.type === "income")
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0)

  // ─── 1. Savings Rate (30%) ───
  let savingsRateScore
  if (totalIncome <= 0) {
    savingsRateScore = 0
  } else {
    const rate = ((totalIncome - totalExpense) / totalIncome) * 100
    if (rate >= 20) savingsRateScore = 100
    else if (rate >= 10) savingsRateScore = 50 + ((rate - 10) / 10) * 50
    else if (rate >= 0) savingsRateScore = (rate / 10) * 50
    else savingsRateScore = 0
  }
  components.push({ name: "Tabungan Rate", score: savingsRateScore, weight: 0.30 })

  // ─── 2. Emergency Fund (25%) ───
  const liquidSavings = transactions  // gunakan SEMUA transaksi, bukan filtered
    .filter(t => t.type === "savings" &&
      (t.category === "Tabungan Cash" || t.category === "Emas"))
    .reduce((s, t) => s + t.amount, 0)

  const monthsWithExpense = monthlyData.filter(m => m.pengeluaran > 0)
  let emergencyScore
  if (monthsWithExpense.length === 0) {
    emergencyScore = 100  // tidak ada pengeluaran = tidak butuh emergency fund
  } else {
    const avgExpense = monthsWithExpense.reduce((s, m) => s + m.pengeluaran, 0)
      / monthsWithExpense.length
    if (avgExpense <= 0) {
      emergencyScore = 100
    } else {
      const months = liquidSavings / avgExpense
      emergencyScore = months >= 6 ? 100 : (months / 6) * 100
    }
  }
  components.push({ name: "Dana Darurat", score: emergencyScore, weight: 0.25 })

  // ─── 3. Budget Adherence (20%) ───
  let budgetScore = null
  const activeBudgets = budgets.filter(b => {
    if (selectedMonth !== "Semua Bulan" && b.bulan !== selectedMonth) return false
    if (selectedYear !== "Semua Tahun" && b.tahun !== String(selectedYear)) return false
    if (selectedAccount !== "Semua Akun" && b.akun && b.akun !== selectedAccount) return false
    return true
  })

  if (activeBudgets.length > 0) {
    const expenseByCategory = {}
    for (const t of filtered) {
      if (t.type !== "expense") continue
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
    }

    let underLimit = 0
    for (const b of activeBudgets) {
      const spent = expenseByCategory[b.kategori] || 0
      if (spent <= b.limit) underLimit++
    }
    budgetScore = (underLimit / activeBudgets.length) * 100
  }
  components.push({ name: "Patuh Budget", score: budgetScore, weight: 0.20 })

  // ─── 4. Goal Progress (15%) ───
  let goalScore = null
  if (goals.length > 0) {
    let totalPct = 0
    for (const goal of goals) {
      const contributed = goalProgress[goal.id] || 0
      const pct = goal.target > 0
        ? Math.min((contributed / goal.target) * 100, 100)
        : 100
      totalPct += pct
    }
    goalScore = totalPct / goals.length
  }
  components.push({ name: "Progress Goal", score: goalScore, weight: 0.15 })

  // ─── 5. Net Worth Growth (10%) — recommended ───
  let growthScore = 50  // default neutral
  if (netWorthHistory.length >= 2) {
    const current = netWorthHistory[netWorthHistory.length - 1].value
    const previous = netWorthHistory[netWorthHistory.length - 2].value

    if (previous === 0) {
      growthScore = current > 0 ? 80 : 0
    } else {
      const growthRate = ((current - previous) / Math.abs(previous)) * 100
      if (growthRate >= 5) growthScore = 100
      else if (growthRate <= -5) growthScore = 0
      else growthScore = 50 + (growthRate / 5) * 50
    }
  }
  components.push({ name: "Pertumbuhan Aset", score: growthScore, weight: 0.10 })

  // ─── Final Score dengan Weight Redistribution ───
  const active = components.filter(c => c.score !== null)
  const totalActiveWeight = active.reduce((s, c) => s + c.weight, 0)

  let totalScore = 0
  if (totalActiveWeight > 0) {
    for (const c of active) {
      totalScore += c.score * (c.weight / totalActiveWeight)
    }
  }
  totalScore = Math.round(totalScore)

  // ─── Grade ───
  let grade
  if (totalScore >= 90) grade = "A"
  else if (totalScore >= 75) grade = "B"
  else if (totalScore >= 60) grade = "C"
  else if (totalScore >= 40) grade = "D"
  else grade = "F"

  return { totalScore, grade, components }
}
```

---

## 7. Contoh Perhitungan

### Contoh 1: User Sehat
```
Pemasukan: Rp 10.000.000/bulan
Pengeluaran: Rp 6.000.000/bulan
Tabungan Cash + Emas: Rp 36.000.000
Budget: 5 kategori, 4 di bawah limit
Goal: 1 goal, target Rp 20jt, terkumpul Rp 15jt
Net Worth: bulan lalu Rp 50jt, sekarang Rp 54jt

Hitung:
A. Savings Rate = (10-6)/10 = 40% → 100 × 30% = 30.0
B. Emergency Fund = 36jt / 6jt = 6 bulan → 100 × 25% = 25.0
C. Budget = 4/5 = 80% → 80 × 20% = 16.0
D. Goal = 15/20 = 75% → 75 × 15% = 11.25
E. Growth = (54-50)/50 = 8% → 100 × 10% = 10.0

Total = 30.0 + 25.0 + 16.0 + 11.25 + 10.0 = 92.25 → 92
Grade: A ✓
```

### Contoh 2: User Baru (1 bulan, belum ada budget/goal)
```
Pemasukan: Rp 8.000.000
Pengeluaran: Rp 7.500.000
Tabungan Cash + Emas: Rp 500.000
Budget: tidak ada
Goal: tidak ada
Net Worth: hanya 1 bulan

Hitung:
A. Savings Rate = (8-7.5)/8 = 6.25% → (6.25/10) × 50 = 31.25 × 30% = 9.375
B. Emergency Fund = 500rb / 7.5jt = 0.067 bulan → (0.067/6) × 100 = 1.11 × 25% = 0.278
C. Budget = null (skip) → bobot 20% di-distribusi
D. Goal = null (skip) → bobot 15% di-distribusi
E. Growth = 50 (neutral, data kurang) × 10% = 5.0

Active weights: 30% + 25% + 10% = 65%
Redistributed:
A = 30/65 = 46.15% → 31.25 × 0.4615 = 14.42
B = 25/65 = 38.46% → 1.11 × 0.3846 = 0.43
E = 10/65 = 15.38% → 50 × 0.1538 = 7.69

Total = 14.42 + 0.43 + 7.69 = 22.54 → 23
Grade: F

Catatan: Score rendah karena memang kondisi keuangan belum stabil.
Tidak dihukum karena belum ada budget/goal.
```

### Contoh 3: Defisit
```
Pemasukan: Rp 5.000.000
Pengeluaran: Rp 6.500.000
Tabungan Cash + Emas: Rp 2.000.000
Budget: 3 kategori, 1 di bawah limit
Goal: 1 goal, target Rp 10jt, terkumpul Rp 1jt
Net Worth: bulan lalu Rp 15jt, sekarang Rp 13.5jt

Hitung:
A. Savings Rate = (5-6.5)/5 = -30% → 0 × 30% = 0
B. Emergency Fund = 2jt / 6.5jt = 0.31 bulan → (0.31/6) × 100 = 5.13 × 25% = 1.28
C. Budget = 1/3 = 33.33% → 33.33 × 20% = 6.67
D. Goal = 1/10 = 10% → 10 × 15% = 1.5
E. Growth = (13.5-15)/15 = -10% → 0 × 10% = 0

Total = 0 + 1.28 + 6.67 + 1.5 + 0 = 9.45 → 9
Grade: F ✓ (defisit = alarm merah)
```

---

## 8. Pertimbangan Tambahan

### Mengapa Net Worth Growth > Income Stability?

1. **Net Worth Growth lebih actionable** — user bisa meningkatkan dengan mengurangi pengeluaran, menambah income, atau berinvestasi
2. **Income Stability di luar kendali** — user salary tetap selalu 100, user freelance selalu rendah
3. **Net Worth Growth mencerminkan hasil akhir** — yang penting bukan berapa yang masuk, tapi berapa yang tersisa dan bertumbuh

### Mengapa Emergency Fund menggunakan SEMUA data (bukan filter bulan)?

Emergency fund adalah **posisi** (balance sheet), bukan **kinerja** (income statement). Jumlah dana darurat saat ini adalah kumulatif dari semua tabungan cash + emas yang pernah masuk. Membandingkan dengan pengeluaran rata-rata semua bulan memberikan gambaran yang lebih realistis tentang "berapa bulan bisa bertahan".

### Mengapa Budget Adherence hanya hitung kategori berbudget?

Jika user hanya set budget untuk 3 dari 18 kategori, itu berarti user hanya ingin mengontrol 3 kategori tersebut. Tidak fair menghukum 15 kategori lain yang memang tidak ingin dibudget. Ini juga mendorong user untuk secara bertahap menambah budget ke lebih banyak kategori.

### Sensitivity Analysis

Jika Savings Rate berubah ±5%, skor final berubah ±1.5 poin (30% × 5).
Jika Emergency Fund berubah ±1 bulan, skor final berubah ±4.17 poin (25% × 16.67).
Jika Budget Adherence berubah ±25%, skor final berubah ±5 poin (20% × 25).

**Kesimpulan:** Savings Rate dan Emergency Fund adalah driver terbesar. Fokus improvement di dua komponen ini memberikan dampak paling besar pada skor.
