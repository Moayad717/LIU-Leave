"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized")
}

export async function toggleSubmissions() {
  await requireAdmin()
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
}

export async function addHoliday(dateISO: string, label: string) {
  await requireAdmin()
  if (!dateISO) return { error: "Date is required." }
  const date = new Date(dateISO)
  if (isNaN(date.getTime())) return { error: "Invalid date." }
  await db.holiday.create({ data: { date, label: label.trim() || null } })
  revalidatePath("/admin/settings")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function removeHoliday(id: string) {
  await requireAdmin()
  await db.holiday.delete({ where: { id } })
  revalidatePath("/admin/settings")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateSettings(data: {
  maxLeaveDays?: number
  campusOverlapThreshold?: number
  deptOverlapEnabled?: boolean
  deptOverlapThreshold?: number
}) {
  await requireAdmin()

  await db.appSettings.upsert({
    where: { id: "global" },
    update: data,
    create: { id: "global", ...data },
  })

  revalidatePath("/admin/settings")
  revalidatePath("/admin/stats")
  revalidatePath("/dashboard")
  return { success: true }
}
