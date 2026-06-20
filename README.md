# 💰 Artoku — Finance Dashboard

Dashboard keuangan pribadi berbasis Next.js yang terhubung langsung ke Google Sheets.

---

## 🚀 Setup (Langkah Demi Langkah)

### 1. Install dependencies
Buka folder `finance-dashboard` di Command Prompt / Terminal, lalu jalankan:
```bash
npm install
```

### 2. Isi file `.env.local`
Buka file `.env.local` dan isi dengan kredensial kamu:
```
GOOGLE_CLIENT_ID=isi_client_id_dari_google_cloud
GOOGLE_CLIENT_SECRET=isi_client_secret_dari_google_cloud
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random_string_panjang_minimal_32_karakter
SPREADSHEET_ID=1fjleD98FeBZIhAybqM9pTfNgnHBxWdTV7sLj24W7TEY
```

Untuk `NEXTAUTH_SECRET`, buka cmd dan jalankan:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Salin outputnya ke `NEXTAUTH_SECRET`.

### 3. Jalankan secara lokal
```bash
npm run dev
```
Buka browser ke: **http://localhost:3000**

### 4. Deploy ke Vercel (gratis)
1. Push folder ini ke GitHub
2. Buka vercel.com → Import project dari GitHub
3. Tambahkan semua env variable di Settings → Environment Variables
4. Tambahkan URL Vercel ke Google Cloud Console:
   - Authorized redirect URIs: `https://nama-project.vercel.app/api/auth/callback/google`
5. Deploy!

---

## 📁 Struktur File
```
src/
  app/
    page.js          → Halaman login
    dashboard/
      page.js        → Dashboard utama
    api/
      auth/          → NextAuth (Google OAuth)
      dashboard/     → API ambil data dari Sheets
  lib/
    sheets.js        → Helper Google Sheets API
```

---

## 📋 Nama Tab Google Sheets yang Dibutuhkan
Pastikan nama tab di spreadsheet kamu sesuai:
- `Rekap Bulanan` — untuk data ringkasan bulanan
- `Pengeluaran` — untuk transaksi pengeluaran
- `Pemasukan` — untuk transaksi pemasukan

Jika nama tab berbeda, ubah di file `src/app/api/dashboard/route.js`.

---

## 🎨 Phase Selanjutnya
- **Phase 2**: Form input transaksi → simpan langsung ke Sheets
- **Phase 3**: Budget per kategori, alert pengeluaran, filter tanggal
