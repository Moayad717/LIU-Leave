"use server"

import { auth, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  canAccessAdmin,
  canManageUsers,
  canAssignRole,
  canBypassApproval,
  Role,
  LeaveStatus,
} from "@/types/enums"
import { revalidatePath } from "next/cache"

// Auth guard for any admin-capable role (ASSISTANT_DEAN, CHAIRMAN, DEAN, COORDINATOR, SUPER_ADMIN)
async function requireApprover() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated.")
  if (!canAccessAdmin(session.user.role)) throw new Error("Access required.")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return await signOut({ redirectTo: "/auth/signin" })

  return session
}

// Auth guard restricted to DEAN / COORDINATOR / SUPER_ADMIN
async function requireHighAuthority() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated.")
  if (!canManageUsers(session.user.role)) throw new Error("Insufficient permissions.")

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return await signOut({ redirectTo: "/auth/signin" })

  return session
}

export async function reviewLeaveRequest(
  requestId: string,
  action: "approve" | "reject",
  comment: string
) {
  const session = await requireApprover()
  const role = session!.user.role

  if (action === "reject" && !comment.trim()) {
    return { error: "A comment is required when rejecting a request." }
  }

  try {
    const request = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { professor: { select: { campusId: true, departmentId: true } } },
    })
    if (!request) return { error: "Leave request not found." }

    // Terminal states cannot be re-reviewed by anyone
    if (request.status === LeaveStatus.APPROVED || request.status === LeaveStatus.REJECTED) {
      return { error: "This request has already been finalised and cannot be changed." }
    }

    // Scope enforcement
    if (role === Role.ASSISTANT_DEAN) {
      if (request.professor.campusId !== session!.user.campusId) {
        return { error: "This request is outside your campus scope." }
      }
      if (request.status !== LeaveStatus.PENDING) {
        return { error: "You can only review requests with Pending status." }
      }
    } else if (role === Role.CHAIRMAN) {
      if (request.professor.departmentId !== session!.user.departmentId) {
        return { error: "This request is outside your department scope." }
      }
      if (request.status !== LeaveStatus.STEP1_APPROVED) {
        return { error: "You can only review requests awaiting Chairman approval." }
      }
    } else if (!canBypassApproval(role)) {
      return { error: "You do not have permission to review requests." }
    }

    // Determine new status
    let newStatus: string
    if (role === Role.ASSISTANT_DEAN) {
      newStatus = action === "approve" ? LeaveStatus.STEP1_APPROVED : LeaveStatus.STEP1_REJECTED
    } else if (role === Role.CHAIRMAN) {
      newStatus = action === "approve" ? LeaveStatus.STEP2_APPROVED : LeaveStatus.STEP2_REJECTED
    } else {
      // DEAN / COORDINATOR / SUPER_ADMIN — always final outcome
      newStatus = action === "approve" ? LeaveStatus.APPROVED : LeaveStatus.REJECTED
    }

    await db.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus as never,
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
  await requireHighAuthority()

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

export async function updateUserRole(
  targetUserId: string,
  newRole: Role,
  campusId?: string | null,
  departmentId?: string | null
) {
  const session = await requireApprover()

  if (targetUserId === session!.user.id) {
    return { error: "You cannot change your own role." }
  }

  try {
    const target = await db.user.findUnique({ where: { id: targetUserId } })
    if (!target) return { error: "User not found." }

    const callerRole = session!.user.role

    if (!canAssignRole(callerRole, newRole)) {
      return { error: "You do not have permission to assign this role." }
    }
    // Also check that the caller can demote from the target's current role
    if (!canAssignRole(callerRole, target.role)) {
      return { error: "You do not have permission to change this user's role." }
    }

    const updateData: Record<string, unknown> = { role: newRole }
    if (newRole === Role.ASSISTANT_DEAN && campusId !== undefined) {
      updateData.campusId = campusId
    }
    if (newRole === Role.CHAIRMAN && departmentId !== undefined) {
      updateData.departmentId = departmentId
    }

    await db.user.update({ where: { id: targetUserId }, data: updateData as never })
    revalidatePath("/admin/users")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}

export async function transferSuperadmin(targetUserId: string) {
  const session = await requireApprover()

  if (targetUserId === session!.user.id) {
    return { error: "You are already the super admin." }
  }

  try {
    // Always verify against DB — JWT may be stale after a previous transfer
    const callerInDb = await db.user.findUnique({
      where: { id: session!.user.id },
      select: { role: true },
    })
    if (callerInDb?.role !== Role.SUPER_ADMIN) {
      return { error: "Only the super admin can transfer this role." }
    }

    await db.$transaction([
      db.user.update({ where: { id: targetUserId }, data: { role: Role.SUPER_ADMIN } }),
      db.user.update({ where: { id: session!.user.id }, data: { role: Role.DEAN } }),
    ])
    revalidatePath("/admin/users")
    return { success: true }
  } catch {
    return { error: "Something went wrong. Please try again." }
  }
}
