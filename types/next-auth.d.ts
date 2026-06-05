import { DefaultSession, DefaultJWT } from "next-auth"
import { Role } from "./enums"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      campusId: string | null
      departmentId: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role?: Role
    campusId?: string | null
    departmentId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string
    role?: Role
    campusId?: string | null
    departmentId?: string | null
    lastRefreshed?: number
  }
}
