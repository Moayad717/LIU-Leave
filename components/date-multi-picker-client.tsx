"use client"

import { useRouter } from "next/navigation"
import { DateMultiPicker } from "./date-multi-picker"
import { isBlockedDate } from "@/lib/academic-year"

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

  const start = new Date(startISO)
  const end = new Date(endISO)

  // Build Sep 16-30 blocked dates within the academic year range
  const blocked: Date[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    if (isBlockedDate(cursor)) {
      blocked.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return (
    <DateMultiPicker
      academicYearStart={start}
      academicYearEnd={end}
      holidays={holidays}
      blockedDates={blocked}
      onSuccess={() => router.refresh()}
      maxDays={maxDays}
    />
  )
}
