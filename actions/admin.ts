"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { LeaveStatus, Role } from "@/types/enums"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated.")
  if (session.user.role !== "ADMIN") throw new Error("Admin access required.")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new Error("Session is stale — please sign out and sign back in.")

  return session
}

export async function reviewLeaveRequest(
  requestId: string,
  action: "APPROVED" | "REJECTED",
  comment: string
) {
  const session = await requireAdmin()

  if (action === "REJECTED" && !comment.trim()) {
    return { error: "A comment is required when rejecting a request." }
  }

  const request = await db.leaveRequest.findUnique({ where: { id: requestId } })
  if (!request) return { error: "Leave request not found." }
  if (request.status !== LeaveStatus.PENDING) {
    return { error: "This request has already been reviewed." }
  }

  await db.leaveRequest.update({
    where: { id: requestId },
    data: {
      status: action,
      adminComment: comment.trim() || null,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
  })

  revalidatePath("/admin")
  revalidatePath("/admin/submissions")
  revalidatePath(`/admin/submissions/${requestId}`)
  revalidatePath("/admin/stats")

  return { success: true }
}

export async function updateUserRole(targetUserId: string, newRole: Role) {
  const session = await requireAdmin()

  if (targetUserId === session.user.id) {
    return { error: "You cannot change your own role." }
  }

  const target = await db.user.findUnique({ where: { id: targetUserId } })
  if (!target) return { error: "User not found." }

  await db.user.update({ where: { id: targetUserId }, data: { role: newRole } })

  revalidatePath("/admin/users")

  return { success: true }
}
