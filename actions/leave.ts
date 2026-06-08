"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentAcademicYear, isBlockedDate } from "@/lib/academic-year"
import { notifyNewSubmission } from "@/lib/email"

export async function submitLeaveRequest(dates: string[]) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated." }

  if (!dates.length) return { error: "Please select at least one date." }

  try {
    const appSettings = await db.appSettings.findUnique({ where: { id: "global" } })
    const maxDays = appSettings?.maxLeaveDays ?? 22

    const { start, end } = getCurrentAcademicYear()

    const parsedDates = dates.map((d) => new Date(d))
    if (parsedDates.some((d) => isNaN(d.getTime()))) {
      return { error: "One or more dates are invalid." }
    }
    if (parsedDates.some((d) => d < start || d > end)) {
      return { error: "All selected dates must fall within the current academic year." }
    }

    // Block Sep 16-30 (academic year closing period)
    if (parsedDates.some((d) => isBlockedDate(d))) {
      return { error: "Dates between September 16–30 are blocked (academic year closing period)." }
    }

    // Count days already used in active (non-rejected) requests this academic year
    const activeRequests = await db.leaveRequest.findMany({
      where: {
        professorId: session.user.id,
        submittedAt: { gte: start, lte: end },
        status: { notIn: ["STEP1_REJECTED", "STEP2_REJECTED", "REJECTED"] as never[] },
      },
      select: { dates: true },
    })
    const usedDays = activeRequests.reduce((sum, r) => sum + r.dates.length, 0)

    if (usedDays + dates.length > maxDays) {
      const remaining = maxDays - usedDays
      return {
        error: remaining <= 0
          ? `You have used all ${maxDays} leave days for this academic year.`
          : `You can only request ${remaining} more day${remaining !== 1 ? "s" : ""} (${maxDays} day cap, ${usedDays} already used).`,
      }
    }

    // Block dates that already exist in another active request
    const activeDateStrings = new Set(
      activeRequests.flatMap((r) =>
        r.dates.map((d) => d.toISOString().slice(0, 10))
      )
    )
    const duplicates = dates.filter((d) => activeDateStrings.has(d))
    if (duplicates.length > 0) {
      return {
        error: `${duplicates.length} date${duplicates.length !== 1 ? "s are" : " is"} already covered by an active request: ${duplicates.join(", ")}.`,
      }
    }

    const [newRequest, professor] = await Promise.all([
      db.leaveRequest.create({
        data: { professorId: session.user.id, dates: parsedDates },
      }),
      db.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          campusId: true,
          campus: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
    ])

    if (professor) {
      await notifyNewSubmission({
        requestId: newRequest.id,
        professorName: professor.name,
        professorEmail: professor.email,
        campusId: professor.campusId,
        campusName: professor.campus?.name ?? null,
        departmentName: professor.department?.name ?? null,
        dates: parsedDates,
      })
    }

    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}
