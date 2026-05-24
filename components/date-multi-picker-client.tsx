"use client"

import { useRouter } from "next/navigation"
import { DateMultiPicker } from "./date-multi-picker"

interface Holiday {
  iso: string
  label: string | null
}

export function DateMultiPickerClient({
  startISO,
  endISO,
  holidays = [],
  maxDays,
}: {
  startISO: string
  endISO: string
  holidays?: Holiday[]
  maxDays?: number
}) {
  const router = useRouter()

  return (
    <DateMultiPicker
      academicYearStart={new Date(startISO)}
      academicYearEnd={new Date(endISO)}
      holidays={holidays}
      onSuccess={() => router.refresh()}
      maxDays={maxDays}
    />
  )
}
