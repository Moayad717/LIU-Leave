"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentAcademicYear } from "@/lib/academic-year"

export async function submitLeaveRequest(dates: string[]) {
  // Auth guard outside try/catch — redirect() must never be caught
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated." }

  if (!dates.length) return { error: "Please select at least one date." }

  try {
    const appSettings = await db.appSettings.findUnique({ where: { id: "global" } })
    const maxDays = appSettings?.maxLeaveDays ?? 22

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
    if (parsedDates.some((d) => isNaN(d.getTime()))) {
      return { error: "One or more dates are invalid." }
    }
    if (parsedDates.some((d) => d < start || d > end)) {
      return { error: "All selected dates must fall within the current academic year." }
    }

    await db.leaveRequest.create({
      data: { professorId: session.user.id, dates: parsedDates },
    })

    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}
