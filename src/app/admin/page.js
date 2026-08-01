import AdminPaymentsClient from "./AdminPaymentsClient"
import AdminFeatureControls from "./AdminFeatureControls"

export const metadata = {
  title: "Admin Pembayaran - Artami",
}

export default function AdminPage() {
  return (
    <>
      <AdminPaymentsClient />
      <AdminFeatureControls />
    </>
  )
}
