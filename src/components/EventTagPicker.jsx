"use client"
import { useMemo } from "react"
import { useEvents } from "@/lib/useSharedData"
import SelectField from "@/app/dashboard/_components/SelectField"

export default function EventTagPicker({ value, onChange }) {
  const { events, loading } = useEvents()
  const activeEvents = useMemo(() =>
    (events || []).filter(e => e.effectiveStatus === "active" || e.status === "active"),
    [events]
  )

  if (loading || activeEvents.length === 0) return null

  const selectedEvent = activeEvents.find(e => e.id === value)
  const displayValue = selectedEvent ? selectedEvent.nama : ""

  const options = ["", ...activeEvents.map(e => e.nama)]

  return (
    <SelectField
      label="Event (opsional)"
      value={displayValue}
      onChange={(nama) => {
        const evt = activeEvents.find(e => e.nama === nama)
        onChange(evt ? evt.id : "")
      }}
      options={options}
      placeholder="Tidak ada event"
    />
  )
}
