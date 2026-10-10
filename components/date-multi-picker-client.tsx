"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { DateMultiPicker } from "./date-multi-picker"
import { isBlockedDate } from "@/lib/academic-year"

interface Holiday {
  iso: string
  label: string | null
}

interface BlockedPeriodRange {
  startISO: string
  endISO: string
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
  blockedPeriods = [],
}: {
  startISO: string
  endISO: string
  holidays?: Holiday[]
  maxDays?: number
  approvedDateISOs?: string[]
  pendingDateISOs?: string[]
  rejectedDateISOs?: string[]
  blockedPeriods?: BlockedPeriodRange[]
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

  // Admin-configured blocked periods (date range) the user isn't exempt from
  const extraBlockedLabels: string[] = []
  for (const period of blockedPeriods) {
    const periodStart = new Date(period.startISO)
    const periodEnd = new Date(period.endISO)
    const dayCursor = new Date(periodStart)
    while (dayCursor <= periodEnd) {
      blocked.push(new Date(dayCursor))
      dayCursor.setDate(dayCursor.getDate() + 1)
    }
    const rangeStr = periodStart.getTime() === periodEnd.getTime()
      ? format(periodStart, "MMM d")
      : `${format(periodStart, "MMM d")}–${format(periodEnd, "MMM d")}`
    extraBlockedLabels.push(period.label ? `${rangeStr}: ${period.label}` : rangeStr)
  }

  return (
    <DateMultiPicker
      academicYearStart={start}
      academicYearEnd={end}
      holidays={holidays}
      blockedDates={blocked}
      extraBlockedLabels={extraBlockedLabels}
      approvedDates={approvedDateISOs.map((iso) => new Date(iso))}
      pendingDates={pendingDateISOs.map((iso) => new Date(iso))}
      rejectedDates={rejectedDateISOs.map((iso) => new Date(iso))}
      onSuccess={() => router.refresh()}
      maxDays={maxDays}
    />
  )
}
