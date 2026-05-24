"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentAcademicYear } from "@/lib/academic-year"

export async function submitLeaveRequest(dates: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated." }

  const appSettings = await db.appSettings.findUnique({ where: { id: "global" } })
  const maxDays = appSettings?.maxLeaveDays ?? 22

  if (!dates.length) return { error: "Please select at least one date." }
  if (dates.length > maxDays) return { error: `Maximum ${maxDays} days allowed.` }

  const { start, end } = getCurrentAcademicYear()

  const existing = await db.leaveRequest.findFirst({
    where: {
      professorId: session.user.id,
      submittedAt: { gte: start, lte: end },
      status: { in: ["PENDING", "APPROVED"] },
    },
  })
  if (existing) {
    return { error: "You already have an active leave request for this academic year." }
  }

  const parsedDates = dates.map((d) => new Date(d))
  const invalid = parsedDates.some((d) => isNaN(d.getTime()))
  if (invalid) return { error: "One or more dates are invalid." }

  const outOfRange = parsedDates.some((d) => d < start || d > end)
  if (outOfRange) {
    return { error: "All selected dates must fall within the current academic year." }
  }

  await db.leaveRequest.create({
    data: {
      professorId: session.user.id,
      dates: parsedDates,
    },
  })

  return { success: true }
}
