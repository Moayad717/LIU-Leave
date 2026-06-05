import type { NextAuthConfig } from "next-auth"
import type { Role } from "@/types/enums"

export const authConfig = {
  session: { strategy: "jwt" as const },
  trustHost: true,
  callbacks: {
    async jwt({ token }) {
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.campusId = (token.campusId as string | null) ?? null
      session.user.departmentId = (token.departmentId as string | null) ?? null
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [],
} satisfies NextAuthConfig
