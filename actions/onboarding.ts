"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function completeOnboarding(campusId: string, departmentId: string) {
  // Auth guard outside try/catch
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated." }

  try {
    const [campus, department] = await Promise.all([
      db.campus.findUnique({ where: { id: campusId } }),
      db.department.findUnique({ where: { id: departmentId } }),
    ])

    if (!campus) return { error: "Invalid campus." }
    if (!department) return { error: "Invalid department." }

    await db.user.update({
      where: { id: session.user.id },
      data: { campusId, departmentId },
    })

    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}
