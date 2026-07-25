import PaymentQrisFlow from "@/components/PaymentQrisFlow"
import PaymentStatusBanner from "@/app/dashboard/_components/PaymentStatusBanner"

export default function UpgradePage() {
  return (
    <>
      <PaymentStatusBanner />
      <PaymentQrisFlow />
    </>
  )
}
