"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateProfile(campusId: string, departmentId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated." }

  const [campus, department] = await Promise.all([
    db.campus.findUnique({ where: { id: campusId } }),
    db.department.findUnique({ where: { id: departmentId } }),
  ])

  if (!campus) return { error: "Invalid campus selected." }
  if (!department) return { error: "Invalid department selected." }

  await db.user.update({
    where: { id: session.user.id },
    data: { campusId, departmentId },
  })

  revalidatePath("/profile")
  revalidatePath("/dashboard")

  return { success: true }
}
