import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import AdminShell from "./AdminShell"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin Workspace - Artami",
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  const email = String(session?.user?.email || "").trim().toLowerCase()
  if (!email) redirect("/api/auth/signin?callbackUrl=/admin")

  const { data, error } = await supabaseAdmin.from("admins").select("email").ilike("email", email).limit(1).maybeSingle()
  if (error) throw error
  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50 px-4 text-center text-earth-900">
        <div>
          <h1 className="font-display text-3xl font-bold">Akses admin diperlukan</h1>
          <p className="mt-2 text-sm text-earth-500">Akun ini tidak memiliki akses ke workspace admin.</p>
        </div>
      </main>
    )
  }

  return <AdminShell />
}
