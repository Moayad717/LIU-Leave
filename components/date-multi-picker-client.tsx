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
  approvedDateISOs = [],
  pendingDateISOs = [],
  rejectedDateISOs = [],
}: {
  startISO: string
  endISO: string
  holidays?: Holiday[]
  maxDays?: number
  approvedDateISOs?: string[]
  pendingDateISOs?: string[]
  rejectedDateISOs?: string[]
}) {
  const router = useRouter()

  const start = new Date(startISO)
  const end = new Date(endISO)

  // Sep 16-30 blocked dates within the academic year range
  const blocked: Date[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    if (isBlockedDate(cursor)) blocked.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return (
    <DateMultiPicker
      academicYearStart={start}
      academicYearEnd={end}
      holidays={holidays}
      blockedDates={blocked}
      approvedDates={approvedDateISOs.map((iso) => new Date(iso))}
      pendingDates={pendingDateISOs.map((iso) => new Date(iso))}
      rejectedDates={rejectedDateISOs.map((iso) => new Date(iso))}
      onSuccess={() => router.refresh()}
      maxDays={maxDays}
    />
  )
}
