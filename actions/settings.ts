"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageUsers } from "@/types/enums"
import { revalidatePath } from "next/cache"

// Auth guard outside try/catch
async function requireAdmin() {
  const session = await auth()
  if (!session || !canManageUsers(session.user.role)) throw new Error("Unauthorized")
}

export async function toggleSubmissions() {
  await requireAdmin()

  try {
    const current = await db.appSettings.findUnique({ where: { id: "global" } })
    const next = !(current?.submissionsOpen ?? true)
    await db.appSettings.upsert({
      where: { id: "global" },
      update: { submissionsOpen: next },
      create: { id: "global", submissionsOpen: next },
    })
    revalidatePath("/admin/settings")
    revalidatePath("/dashboard")
    return { submissionsOpen: next }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function addHoliday(dateISO: string, label: string) {
  await requireAdmin()

  if (!dateISO) return { error: "Date is required." }
  const date = new Date(dateISO)
  if (isNaN(date.getTime())) return { error: "Invalid date." }

  try {
    await db.holiday.create({ data: { date, label: label.trim() || null } })
    revalidatePath("/admin/settings")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function removeHoliday(id: string) {
  await requireAdmin()

  try {
    await db.holiday.delete({ where: { id } })
    revalidatePath("/admin/settings")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function updateSettings(data: {
  maxLeaveDays?: number
  campusOverlapThreshold?: number
  deptOverlapEnabled?: boolean
  deptOverlapThreshold?: number
}) {
  await requireAdmin()

  try {
    await db.appSettings.upsert({
      where: { id: "global" },
      update: data,
      create: { id: "global", ...data },
    })
    revalidatePath("/admin/settings")
    revalidatePath("/admin/stats")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function bulkAddHolidays(entries: { date: string; label: string }[]) {
  await requireAdmin()

  try {
    const incomingDates = entries.map((e) => new Date(e.date + "T00:00:00"))
    const existing = await db.holiday.findMany({
      where: { date: { in: incomingDates } },
      select: { date: true },
    })
    const existingSet = new Set(existing.map((h) => h.date.toISOString().slice(0, 10)))
    const toCreate = entries.filter((e) => !existingSet.has(e.date))

    const created = await Promise.all(
      toCreate.map((e) =>
        db.holiday.create({ data: { date: new Date(e.date + "T00:00:00"), label: e.label || null } })
      )
    )

    revalidatePath("/admin/settings")
    revalidatePath("/dashboard")
    return { created }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function clearAllHolidays() {
  await requireAdmin()

  try {
    await db.holiday.deleteMany()
    revalidatePath("/admin/settings")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function resetDatabase() {
  await requireAdmin()

  try {
    await db.leaveRequest.deleteMany()
    await db.account.deleteMany()
    await db.user.deleteMany()
    revalidatePath("/admin")
    revalidatePath("/admin/submissions")
    revalidatePath("/admin/stats")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}
