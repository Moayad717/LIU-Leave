export type Role = "PROFESSOR" | "ADMIN" | "SUPERADMIN"
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED"

export const Role = {
  PROFESSOR: "PROFESSOR" as const,
  ADMIN: "ADMIN" as const,
  SUPERADMIN: "SUPERADMIN" as const,
}

export const LeaveStatus = {
  PENDING: "PENDING" as const,
  APPROVED: "APPROVED" as const,
  REJECTED: "REJECTED" as const,
}

export function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPERADMIN"
}
