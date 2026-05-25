"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// Auth guard outside try/catch
async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")
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
