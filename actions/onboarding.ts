"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function completeOnboarding(campusId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not authenticated." }

  if (session.user.campusId) return { error: "Campus already set." }

  const campus = await db.campus.findUnique({ where: { id: campusId } })
  if (!campus) return { error: "Invalid campus." }

  await db.user.update({
    where: { id: session.user.id },
    data: { campusId },
  })

  return { success: true }
}
