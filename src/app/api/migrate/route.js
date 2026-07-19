export const dynamic = "force-dynamic"

function migrationDisabled() {
  return Response.json(
    {
      error: "Route migrasi shared spreadsheet sudah dinonaktifkan. Gunakan koneksi owner-only legacy sheet.",
    },
    { status: 410 }
  )
}

export const GET = migrationDisabled
export const POST = migrationDisabled
