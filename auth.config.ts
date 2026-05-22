import type { NextAuthConfig } from "next-auth"
import type { Role } from "@/types/enums"

// Edge-compatible config used by middleware (no Prisma, no DB calls)
export const authConfig = {
  session: { strategy: "jwt" as const },
  trustHost: true,
  callbacks: {
    async jwt({ token }) {
      // Middleware just reads the existing token — no DB queries
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.campusId = (token.campusId as string | null) ?? null
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [],
} satisfies NextAuthConfig
