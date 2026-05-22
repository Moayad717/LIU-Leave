// String literal union types matching the Prisma enums in schema.prisma
// These are compatible with the generated @prisma/client types.

export type Role = "PROFESSOR" | "ADMIN"
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED"

export const Role = {
  PROFESSOR: "PROFESSOR" as const,
  ADMIN: "ADMIN" as const,
}

export const LeaveStatus = {
  PENDING: "PENDING" as const,
  APPROVED: "APPROVED" as const,
  REJECTED: "REJECTED" as const,
}
