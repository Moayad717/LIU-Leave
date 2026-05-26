"use server"

import { auth, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin, LeaveStatus, Role } from "@/types/enums"
import { revalidatePath } from "next/cache"

// Auth guard kept separate so signOut's internal redirect() is never inside a try/catch
async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated.")
  if (!isAdmin(session.user.role)) throw new Error("Admin access required.")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  // signOut calls redirect() internally — must not be inside any try/catch
  if (!user) return await signOut({ redirectTo: "/auth/signin" })

  return session
}

export async function reviewLeaveRequest(
  requestId: string,
  action: "APPROVED" | "REJECTED",
  comment: string
) {
  // requireAdmin is outside try/catch so its signOut redirect propagates correctly
  const session = await requireAdmin()

  if (action === "REJECTED" && !comment.trim()) {
    return { error: "A comment is required when rejecting a request." }
  }

  try {
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
        reviewedById: session!.user.id,
      },
    })

    revalidatePath("/admin")
    revalidatePath("/admin/submissions")
    revalidatePath(`/admin/submissions/${requestId}`)
    revalidatePath("/admin/stats")

    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function deleteLeaveRequest(requestId: string) {
  await requireAdmin()

  try {
    await db.leaveRequest.delete({ where: { id: requestId } })
    revalidatePath("/admin")
    revalidatePath("/admin/submissions")
    revalidatePath("/admin/stats")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function updateUserRole(targetUserId: string, newRole: Role) {
  const session = await requireAdmin()

  if (targetUserId === session!.user.id) {
    return { error: "You cannot change your own role." }
  }

  try {
    const target = await db.user.findUnique({ where: { id: targetUserId } })
    if (!target) return { error: "User not found." }

    const callerRole = session!.user.role
    const targetRole = target.role as Role

    // Only SUPERADMIN can touch other admins or assign SUPERADMIN
    if (targetRole !== Role.PROFESSOR && callerRole !== Role.SUPERADMIN) {
      return { error: "Only the superadmin can demote admins." }
    }
    if (newRole === Role.SUPERADMIN && callerRole !== Role.SUPERADMIN) {
      return { error: "Only the superadmin can assign the superadmin role." }
    }

    await db.user.update({ where: { id: targetUserId }, data: { role: newRole } })
    revalidatePath("/admin/users")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function transferSuperadmin(targetUserId: string) {
  const session = await requireAdmin()

  if (session!.user.role !== Role.SUPERADMIN) {
    return { error: "Only the superadmin can transfer this role." }
  }
  if (targetUserId === session!.user.id) {
    return { error: "You are already the superadmin." }
  }

  try {
    await db.$transaction([
      db.user.update({ where: { id: targetUserId }, data: { role: Role.SUPERADMIN } }),
      db.user.update({ where: { id: session!.user.id }, data: { role: Role.ADMIN } }),
    ])
    revalidatePath("/admin/users")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}
