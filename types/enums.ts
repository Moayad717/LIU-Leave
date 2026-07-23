export type Role =
  | "PROFESSOR"
  | "DEAN"
  | "COORDINATOR"
  | "ASSISTANT_DEAN"
  | "CHAIRMAN"
  | "SUPER_ADMIN"

export type LeaveStatus =
  | "PENDING"
  | "STEP1_APPROVED"
  | "STEP1_REJECTED"
  | "STEP2_APPROVED"
  | "STEP2_REJECTED"
  | "APPROVED"
  | "REJECTED"

export const Role = {
  PROFESSOR:      "PROFESSOR"      as const,
  DEAN:           "DEAN"           as const,
  COORDINATOR:    "COORDINATOR"    as const,
  ASSISTANT_DEAN: "ASSISTANT_DEAN" as const,
  CHAIRMAN:       "CHAIRMAN"       as const,
  SUPER_ADMIN:    "SUPER_ADMIN"    as const,
}

export const LeaveStatus = {
  PENDING:        "PENDING"        as const,
  STEP1_APPROVED: "STEP1_APPROVED" as const,
  STEP1_REJECTED: "STEP1_REJECTED" as const,
  STEP2_APPROVED: "STEP2_APPROVED" as const,
  STEP2_REJECTED: "STEP2_REJECTED" as const,
  APPROVED:       "APPROVED"       as const,
  REJECTED:       "REJECTED"       as const,
}

// All non-professor roles have access to /admin
export function canAccessAdmin(role: string) {
  return role !== Role.PROFESSOR
}

// Step-specific approval gates
export function canApproveStep1(role: string) {
  return role === Role.ASSISTANT_DEAN
}
export function canApproveStep2(role: string) {
  return role === Role.CHAIRMAN
}

// DEAN / COORDINATOR / SUPER_ADMIN can do step-3 and bypass any step
export function canBypassApproval(role: string) {
  return role === Role.DEAN || role === Role.COORDINATOR || role === Role.SUPER_ADMIN
}

// Bulk approve on submissions page — DEAN and SUPER_ADMIN only (not COORDINATOR)
export function canBulkApprove(role: string) {
  return role === Role.DEAN || role === Role.SUPER_ADMIN
}

// Users page + Settings page — only higher authority roles
export function canManageUsers(role: string) {
  return role === Role.DEAN || role === Role.COORDINATOR || role === Role.SUPER_ADMIN
}

// Role assignment permissions — returns true if caller can assign newRole to a target
export function canAssignRole(callerRole: string, newRole: string): boolean {
  if (callerRole === Role.SUPER_ADMIN) return true
  if (callerRole === Role.DEAN) {
    return newRole !== Role.DEAN && newRole !== Role.SUPER_ADMIN
  }
  if (callerRole === Role.COORDINATOR) {
    return (
      newRole !== Role.DEAN &&
      newRole !== Role.COORDINATOR &&
      newRole !== Role.SUPER_ADMIN
    )
  }
  return false
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case Role.SUPER_ADMIN:    return "Super Admin"
    case Role.DEAN:           return "Dean"
    case Role.COORDINATOR:    return "Coordinator"
    case Role.ASSISTANT_DEAN: return "Assistant Dean"
    case Role.CHAIRMAN:       return "Chairman"
    case Role.PROFESSOR:      return "Professor"
    default:                  return role
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case LeaveStatus.PENDING:        return "Awaiting Asst. Dean"
    case LeaveStatus.STEP1_APPROVED: return "Awaiting Chairman"
    case LeaveStatus.STEP1_REJECTED: return "Rejected (Step 1)"
    case LeaveStatus.STEP2_APPROVED: return "Awaiting Dean"
    case LeaveStatus.STEP2_REJECTED: return "Rejected (Step 2)"
    case LeaveStatus.APPROVED:       return "Approved"
    case LeaveStatus.REJECTED:       return "Rejected"
    default:                         return status
  }
}

export function isRejected(status: string): boolean {
  return (
    status === LeaveStatus.STEP1_REJECTED ||
    status === LeaveStatus.STEP2_REJECTED ||
    status === LeaveStatus.REJECTED
  )
}
