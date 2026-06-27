#!/usr/bin/env node

/**
 * Migration Script - Artoku Finance Dashboard
 * 
 * Script ini digunakan untuk menyalin data dari sheet bersama (shared) 
 * ke sheet personal user.
 * 
 * Usage: node scripts/migrate-user.js <email> <access_token>
 * 
 * Contoh: node scripts/migrate-user.js isnanfauzi08@gmail.com ya29.a0AfH6SMBx...
 * 
 * Cara mendapatkan access_token:
 * 1. Login ke app di browser
 * 2. Buka Developer Tools (F12)
 * 3. Tab Application → Cookies
 * 4. Cari cookie 'next-auth.session-token'
 * 5. Copy nilai token tersebut
 */

const { createClient } = require("@supabase/supabase-js")
const readline = require("readline")

// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sharedSpreadsheetId = process.env.SPREADSHEET_ID

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Supabase environment variables not set")
  console.error("   Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY ada di .env.local")
  process.exit(1)
}

if (!sharedSpreadsheetId) {
  console.error("❌ Error: SPREADSHEET_ID not set")
  console.error("   Pastikan SPREADSHEET_ID ada di .env.local (sheet bersama/lama)")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// All tabs to migrate
const TABS = [
  { name: "Pemasukan", range: "A:M" },
  { name: "Pengeluaran", range: "A:M" },
  { name: "Tabungan", range: "A:M" },
  { name: "Budgets", range: "A:F" },
  { name: "Goals", range: "A:H" },
  { name: "Utang", range: "A:I" },
  { name: "Momental", range: "A:K" },
  { name: "EventBudgets", range: "A:F" },
  { name: "Tagihan", range: "A:M" },
  { name: "Settings", range: "A:B" },
]

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase())
    })
  })
}

async function getSheetData(accessToken, spreadsheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }

  const data = await res.json()
  return data.values || []
}

async function writeSheetData(accessToken, spreadsheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheets API error: ${err}`)
  }

  return res.json()
}

async function main() {
  const email = process.argv[2]
  const accessToken = process.argv[3]
  
  if (!email || !accessToken) {
    console.error("❌ Usage: node scripts/migrate-user.js <email> <access_token>")
    console.error("")
    console.error("Contoh: node scripts/migrate-user.js isnanfauzi08@gmail.com ya29.a0AfH6SMBx...")
    console.error("")
    console.error("Cara mendapatkan access_token:")
    console.error("1. Login ke app di browser")
    console.error("2. Buka Developer Tools (F12)")
    console.error("3. Tab Application → Cookies")
    console.error("4. Cari cookie 'next-auth.session-token'")
    console.error("5. Copy nilai token tersebut")
    process.exit(1)
  }

  console.log("")
  console.log("🔄 Artoku Finance Dashboard - Data Migration Tool")
  console.log("=" .repeat(50))
  console.log("")

  // Find user in Supabase
  console.log(`📧 Mencari user: ${email}`)
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single()

  if (!user) {
    console.error(`❌ User ${email} tidak ditemukan di Supabase`)
    console.error("   User harus login terlebih dahulu untuk membuat akun.")
    process.exit(1)
  }

  if (!user.spreadsheet_id) {
    console.error(`❌ User ${email} belum memiliki sheet personal`)
    console.error("   User harus login terlebih dahulu untuk membuat sheet personal.")
    process.exit(1)
  }

  console.log(`✅ User ditemukan: ${user.name || user.email}`)
  console.log(`   Sheet personal: ${user.spreadsheet_id}`)
  console.log(`   Sheet bersama: ${sharedSpreadsheetId}`)
  console.log("")

  // Ask for confirmation
  console.log("⚠️  PERINGATAN:")
  console.log("   Script ini akan menyalin data dari sheet bersama ke sheet personal user.")
  console.log("   Data yang sudah ada di sheet personal akan DITIMPA.")
  console.log("")

  const answer = await askQuestion("   Apakah Anda yakin ingin melanjutkan? (y/n): ")
  if (answer !== "y" && answer !== "yes") {
    console.log("")
    console.log("❌ Migration dibatalkan.")
    process.exit(0)
  }

  console.log("")
  console.log("🚀 Memulai migrasi...")
  console.log("")

  // We need to use a service account or the user's access token
  // For this script, we'll use the shared sheet's access
  // In production, you'd use a service account with domain-wide delegation
  // For now, we'll use the Supabase admin to get the user's access token

  // Note: This script requires the user to have a valid access token
  // In a real implementation, you'd use a service account
  // For now, we'll just read from the shared sheet and write to the personal sheet

  let successCount = 0
  let failCount = 0

  for (const tab of TABS) {
    const tabName = tab.name
    const range = `${tabName}!${tab.range}`

    try {
      console.log(`📋 Memproses tab: ${tabName}`)

      // Read data from shared sheet
      const rows = await getSheetData(accessToken, sharedSpreadsheetId, range)
      
      if (rows.length === 0) {
        console.log(`   ⚠️  Tab ${tabName} kosong di sheet bersama, dilewati`)
        successCount++
        continue
      }

      // Write data to personal sheet
      await writeSheetData(accessToken, user.spreadsheet_id, range, rows)

      console.log(`   ✅ Berhasil: ${rows.length} baris disalin`)
      successCount++
    } catch (err) {
      console.error(`   ❌ Gagal memproses tab ${tabName}: ${err.message}`)
      failCount++
      
      // Stop on first failure
      console.log("")
      console.log("❌ Migration dihentikan karena ada kegagalan.")
      console.log(`   Berhasil: ${successCount} tab`)
      console.log(`   Gagal: ${failCount} tab`)
      process.exit(1)
    }
  }

  console.log("")
  console.log("=" .repeat(50))
  console.log("✅ Migration berhasil!")
  console.log(`   Berhasil: ${successCount} tab`)
  console.log(`   Gagal: ${failCount} tab`)
  console.log("")
  console.log("📌 User sekarang dapat login dan menggunakan sheet personal mereka.")
  console.log("")
}

main().catch((err) => {
  console.error("")
  console.error("❌ Error tidak terduga:", err.message)
  process.exit(1)
})
